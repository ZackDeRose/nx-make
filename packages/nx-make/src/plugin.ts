import type {
  CreateNodesV2,
  CreateNodesContextV2,
  CreateNodesResult,
  CreateDependencies,
  CreateDependenciesContext,
  RawProjectGraphDependency,
  TargetConfiguration,
} from '@nx/devkit';
import { createNodesFromFiles, DependencyType, validateDependency } from '@nx/devkit';
import { dirname, join } from 'node:path';
import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs';
import { execSync } from 'node:child_process';

export interface MakePluginOptions {
  targetName?: string;
  /**
   * Compiler to use for dependency detection
   * - 'gcc' (default): Use gcc -MM for dependency detection
   * - 'clang': Use clang -MM for dependency detection
   * - 'manual': Use regex-based parsing (fallback for environments without compilers)
   *
   * Throws an error if the specified compiler is not available.
   */
  dependencyCompiler?: 'gcc' | 'clang' | 'manual';
}

const MAKEFILE_GLOB = '**/Makefile';

/**
 * Parses a Makefile to extract target names and their prerequisites
 * Returns a map of target names to their prerequisites
 */
function parseMakefile(makefilePath: string): Map<string, string[]> {
  const targets = new Map<string, string[]>();

  if (!existsSync(makefilePath)) {
    return targets;
  }

  const content = readFileSync(makefilePath, 'utf-8');

  // Match target definitions with prerequisites
  // Format: target: prerequisite1 prerequisite2
  // Also handles targets without prerequisites: target:
  const targetRegex = /^([a-zA-Z0-9_-]+):\s*([^\n]*)/gm;
  const matches = content.matchAll(targetRegex);

  for (const match of matches) {
    const targetName = match[1];
    const prerequisitesStr = match[2];

    // Skip special targets and internal targets (starting with .)
    if (targetName.startsWith('.') || targetName.startsWith('_')) {
      continue;
    }

    // Parse prerequisites (space-separated, may include variables)
    const prerequisites = prerequisitesStr
      .split(/\s+/)
      .filter(p => p && !p.includes('$')) // Skip empty and variable refs
      .filter(p => !p.startsWith('/'))    // Skip absolute paths (files, not targets)
      .filter(p => !p.startsWith('@'))    // Skip commands like @echo
      .filter(p => !p.startsWith('"'));   // Skip string literals

    targets.set(targetName, prerequisites);
  }

  return targets;
}

// Supported file extensions for C/C++ source files (used with gcc -MM)
const CPP_SOURCE_EXTENSIONS = ['.c', '.cpp', '.cc', '.cxx', '.C'];

// Directories to skip during scanning
const EXCLUDE_DIRS = ['dist', 'build', 'node_modules', '.git', '.nx', 'out', 'target', 'bin', 'obj'];

/**
 * Gets the compiler command, throwing an error if not available
 * Defaults to 'gcc' if no preference specified
 */
function getCompilerCommand(preferredCompiler?: 'gcc' | 'clang' | 'manual'): string | null {
  const compiler = preferredCompiler || 'gcc';

  // Manual mode - use regex parsing instead of compiler
  if (compiler === 'manual') {
    return null;
  }

  // Check if the specified compiler is available
  try {
    execSync(`${compiler} --version`, { stdio: 'ignore' });
    return compiler;
  } catch {
    throw new Error(
      `[nx-make] Compiler '${compiler}' is not available. ` +
      `Please install ${compiler} or set dependencyCompiler to 'manual' in nx.json. ` +
      `See: https://github.com/ZackDeRose/nx-make#requirements`
    );
  }
}

/**
 * Extracts -I include paths from a Makefile
 * Returns an array of include path flags like ['-I../deps/hiredis', '-I../deps/lua/src']
 */
function extractIncludePathsFromMakefile(makefilePath: string): string[] {
  if (!existsSync(makefilePath)) {
    return [];
  }

  try {
    const content = readFileSync(makefilePath, 'utf-8');
    const includePaths: Set<string> = new Set();

    // Look for -I flags in the Makefile
    // Match: -I../path, -I$(VAR), -I/path, -I ./path, etc.
    // Stop at whitespace, quotes, or backslashes
    const includeRegex = /-I\s*([^\s"'\\]+)/g;
    const matches = content.matchAll(includeRegex);

    for (const match of matches) {
      let includePath = match[1];

      // Skip variable references for now (too complex to resolve)
      if (includePath.includes('$')) {
        continue;
      }

      // Clean up the path - remove any trailing quotes or special chars
      includePath = includePath.replace(/["']+$/, '').trim();

      if (includePath) {
        // Store with -I prefix intact
        includePaths.add(`-I${includePath}`);
      }
    }

    const paths = Array.from(includePaths);

    // Debug logging - remove after testing
    if (paths.length > 0 && makefilePath.includes('src/Makefile')) {
      console.log(`[nx-make] Extracted ${paths.length} include paths from ${makefilePath}:`, paths);
    }

    return paths;
  } catch {
    return [];
  }
}

/**
 * Uses gcc/clang -MM to get accurate dependencies for a source file
 * Returns an array of included file paths
 * Optionally accepts include paths from the Makefile
 */
function getDependenciesFromCompiler(
  sourceFile: string,
  workspaceRoot: string,
  compiler: string,
  includePaths: string[] = []
): string[] {
  try {
    // Build the compiler command with include paths
    const includeFlags = includePaths.join(' ');
    const command = `${compiler} -MM -MT dummy ${includeFlags} "${sourceFile}"`;

    const output = execSync(command, {
      cwd: workspaceRoot,
      encoding: 'utf-8',
      stdio: ['ignore', 'pipe', 'ignore'], // Suppress stderr
    });

    // Parse output format: "dummy: source.c header1.h header2.h ..."
    // Remove the target part and backslash continuations
    const cleaned = output
      .replace(/^[^:]*:\s*/, '') // Remove "dummy: "
      .replace(/\\\n/g, ' ')      // Handle line continuations
      .trim();

    // Split by whitespace and filter out the source file itself
    const deps = cleaned
      .split(/\s+/)
      .filter(dep => dep && dep !== sourceFile);

    return deps;
  } catch {
    // If compiler fails (file doesn't compile, etc.), return empty
    return [];
  }
}

/**
 * Manual (regex-based) include scanning - fallback when compiler is not used
 */
function scanForIncludesManual(projectDir: string, projectRoot: string): Map<string, string> {
  const includes: Map<string, string> = new Map();

  function scanDirectory(dir: string) {
    if (!existsSync(dir)) return;

    try {
      const entries = readdirSync(dir);

      for (const entry of entries) {
        const fullPath = join(dir, entry);
        const stat = statSync(fullPath);

        if (EXCLUDE_DIRS.includes(entry)) {
          continue;
        }

        if (stat.isDirectory()) {
          scanDirectory(fullPath);
        } else if (CPP_SOURCE_EXTENSIONS.some(ext => entry.endsWith(ext)) || entry.endsWith('.h') || entry.endsWith('.hpp')) {
          try {
            const content = readFileSync(fullPath, 'utf-8');
            // Simple regex - less accurate than compiler but works without dependencies
            const includeRegex = /#include\s+["<]([^">]+)[">]/g;
            const matches = content.matchAll(includeRegex);

            for (const match of matches) {
              const includePath = match[1];
              const relativeFilePath = fullPath.replace(projectDir + '/', '');
              const sourceFile = join(projectRoot, relativeFilePath);
              includes.set(includePath, sourceFile);
            }
          } catch {
            // Skip files that can't be read
          }
        }
      }
    } catch {
      // Skip directories that can't be read
    }
  }

  scanDirectory(projectDir);
  return includes;
}

/**
 * Scans C/C++ files for #include statements using compiler-based detection
 */
function scanForIncludesWithCompiler(
  projectDir: string,
  projectRoot: string,
  compiler: string,
  workspaceRoot: string
): Map<string, string> {
  const includes: Map<string, string> = new Map();

  // Try to extract include paths from the project's Makefile
  const makefilePath = join(projectDir, 'Makefile');
  const includePaths = extractIncludePathsFromMakefile(makefilePath);

  function scanDirectory(dir: string) {
    if (!existsSync(dir)) return;

    try {
      const entries = readdirSync(dir);

      for (const entry of entries) {
        const fullPath = join(dir, entry);
        const stat = statSync(fullPath);

        if (EXCLUDE_DIRS.includes(entry)) {
          continue;
        }

        if (stat.isDirectory()) {
          scanDirectory(fullPath);
        } else if (CPP_SOURCE_EXTENSIONS.some(ext => entry.endsWith(ext))) {
          const deps = getDependenciesFromCompiler(fullPath, projectDir, compiler, includePaths);
          const relativeFilePath = fullPath.replace(projectDir + '/', '');
          const sourceFile = join(projectRoot, relativeFilePath);

          for (const dep of deps) {
            const normalizedDep = dep.replace(/\\/g, '/');
            includes.set(normalizedDep, sourceFile);
          }
        }
      }
    } catch {
      // Skip directories that can't be read
    }
  }

  scanDirectory(projectDir);
  return includes;
}

/**
 * Scans C/C++ files for #include statements
 * Uses gcc/clang -MM by default (industry standard) or manual regex parsing
 */
function scanForIncludes(
  projectDir: string,
  projectRoot: string,
  workspaceRoot: string,
  options?: MakePluginOptions
): Map<string, string> {
  const compiler = getCompilerCommand(options?.dependencyCompiler);

  // Use manual regex parsing if compiler is null (manual mode)
  if (!compiler) {
    return scanForIncludesManual(projectDir, projectRoot);
  }

  // Use compiler-based detection with Makefile include paths
  return scanForIncludesWithCompiler(projectDir, projectRoot, compiler, workspaceRoot);
}

/**
 * Maps include paths to project names for dependency detection
 * Returns a map of target project names to the source files that include them
 */
function mapIncludesToProjectNames(
  projectName: string,
  projectRoot: string,
  includes: Map<string, string>,
  allProjects: Record<string, { root: string }>,
  workspaceRoot: string
): Map<string, string[]> {
  const projectDependencies = new Map<string, string[]>();
  const projectDir = join(workspaceRoot, projectRoot);

  for (const [includePath, sourceFile] of includes) {
    // Handle relative includes pointing to other projects
    // e.g., "../math-lib/math_ops.h" or "../other-project/header.h"
    if (includePath.startsWith('../')) {
      const parts = includePath.split('/');
      if (parts.length >= 2) {
        const potentialProjectDir = parts[1];

        // Try to find which project owns this directory
        for (const [otherProjectName, otherProject] of Object.entries(allProjects)) {
          if (otherProjectName === projectName) continue;

          const otherProjectAbsPath = join(workspaceRoot, otherProject.root);
          const siblingPath = join(dirname(projectDir), potentialProjectDir);

          if (
            existsSync(siblingPath) &&
            statSync(siblingPath).isDirectory() &&
            siblingPath === otherProjectAbsPath
          ) {
            if (!projectDependencies.has(otherProjectName)) {
              projectDependencies.set(otherProjectName, []);
            }
            projectDependencies.get(otherProjectName)!.push(sourceFile);
            break;
          }
        }
      }
    }
  }

  return projectDependencies;
}

/**
 * Creates Nx targets for each Make target found in the Makefile
 */
function createTargetsForMakefile(
  makefilePath: string,
  projectRoot: string,
  options: MakePluginOptions
): Record<string, TargetConfiguration> {
  const targets: Record<string, TargetConfiguration> = {};
  const makeTargets = parseMakefile(makefilePath);

  for (const [makeTarget, prerequisites] of makeTargets) {
    const targetName = options.targetName
      ? `${options.targetName}:${makeTarget}`
      : makeTarget;

    const targetConfig: TargetConfiguration = {
      executor: 'nx-make:make',
      options: {
        target: makeTarget,
        cwd: projectRoot,
      },
      metadata: {
        technologies: ['make'],
        description: `Run make ${makeTarget}`,
      },
    };

    // Build dependsOn from Makefile prerequisites
    const dependsOn: string[] = [];

    // Add cross-project dependencies for build-like targets
    if (makeTarget === 'build' || makeTarget === 'compile' || makeTarget === 'all') {
      dependsOn.push('^build');
    }

    // Add intra-project dependencies from Make prerequisites
    for (const prereq of prerequisites) {
      // Check if this prerequisite is also a Make target (not a file)
      if (makeTargets.has(prereq)) {
        const prereqTargetName = options.targetName
          ? `${options.targetName}:${prereq}`
          : prereq;
        dependsOn.push(prereqTargetName);
      }
    }

    if (dependsOn.length > 0) {
      targetConfig.dependsOn = dependsOn;
    }

    targets[targetName] = targetConfig;
  }

  // Auto-generate serve target if both build/compile and run targets exist
  const hasBuildTarget = Array.from(makeTargets.keys()).some(t =>
    t === 'build' || t === 'compile' || t === 'all'
  );
  const hasRunTarget = makeTargets.has('run');

  if (hasBuildTarget && hasRunTarget) {
    const serveTargetName = options.targetName
      ? `${options.targetName}:serve`
      : 'serve';

    const runTargetName = options.targetName
      ? `${options.targetName}:run`
      : 'run';

    // Use {projectName} placeholder which Nx will replace at runtime
    // --includeDependentProjects: Watch dependencies too
    // --initialRun: Run immediately on start, then watch for changes
    targets[serveTargetName] = {
      command: `nx watch --projects={projectName} --includeDependentProjects --initialRun -- nx run {projectName}:${runTargetName}`,
      metadata: {
        technologies: ['make'],
        description: 'Watch for changes and automatically rebuild and rerun',
        help: {
          command: `nx ${serveTargetName}`,
          example: {
            options: {
              verbose: true,
            },
          },
        },
      },
    };
  }

  return targets;
}

export const createNodesV2: CreateNodesV2<MakePluginOptions> = [
  MAKEFILE_GLOB,
  async (configFiles, options, context) => {
    const normalizedOptions = options ?? {};
    return await createNodesFromFiles(
      (configFile: string, opts: MakePluginOptions | undefined, ctx: CreateNodesContextV2) =>
        createNodesInternal(configFile, opts ?? normalizedOptions, ctx),
      configFiles,
      normalizedOptions,
      context
    );
  },
];

// Legacy export for backwards compatibility
export const createNodes = createNodesV2;

/**
 * Derives a unique project name from the project root path
 * Uses full path to avoid conflicts between similarly named directories
 * Examples:
 *   "examples/hello-world" -> "hello-world"
 *   "deps/hiredis" -> "deps-hiredis"
 *   "deps/lua/src" -> "deps-lua-src"
 *   "src" -> "src"
 *   "." -> "root"
 */
function deriveProjectName(projectRoot: string): string {
  // If root is ".", use "root"
  if (projectRoot === '.') {
    return 'root';
  }

  // Replace slashes with dashes for unique names
  // But simplify if it's a top-level directory
  const parts = projectRoot.split('/').filter(p => p);

  // For single-level paths, just use the name
  if (parts.length === 1) {
    return parts[0];
  }

  // For nested paths, use the full path with dashes
  // Skip common prefixes like "examples" for cleaner names
  if (parts[0] === 'examples' && parts.length === 2) {
    return parts[1];
  }

  // Otherwise use the full path
  return parts.join('-');
}

function createNodesInternal(
  makefilePath: string,
  options: MakePluginOptions,
  context: CreateNodesContextV2
): CreateNodesResult {
  const projectRoot = dirname(makefilePath);
  const absoluteMakefilePath = join(context.workspaceRoot, makefilePath);

  // Derive project name from directory path
  const projectName = deriveProjectName(projectRoot);

  // Create targets for all Make targets in the Makefile
  const targets = createTargetsForMakefile(
    absoluteMakefilePath,
    projectRoot,
    options
  );

  return {
    projects: {
      [projectRoot]: {
        name: projectName,
        targets,
        // Dependencies will be detected via createDependencies API
      },
    },
  };
}

/**
 * Proper dependency detection using Nx's CreateDependencies API
 * This analyzes C #include statements and creates native project graph dependencies
 */
export const createDependencies: CreateDependencies<MakePluginOptions> = (
  options: MakePluginOptions | undefined,
  context: CreateDependenciesContext
) => {
  const dependencies: RawProjectGraphDependency[] = [];

  // Analyze each project for C file includes
  for (const [projectName, projectConfig] of Object.entries(context.projects)) {
    const projectRoot = projectConfig.root || projectName;
    const projectAbsPath = join(context.workspaceRoot, projectRoot);

    // Scan for #include statements in this project (returns Map<includePath, sourceFile>)
    const includes = scanForIncludes(projectAbsPath, projectRoot, context.workspaceRoot, options);

    // Map include paths to actual project dependencies
    const projectDependencies = mapIncludesToProjectNames(
      projectName,
      projectRoot,
      includes,
      context.projects,
      context.workspaceRoot
    );

    // Create static dependencies for each detected include
    for (const [targetProject, sourceFiles] of projectDependencies) {
      // Use the first source file that includes this dependency
      const sourceFile = sourceFiles[0];

      const dependency: RawProjectGraphDependency = {
        source: projectName,
        target: targetProject,
        type: DependencyType.static,
        sourceFile, // Required for validation
      };

      // Validate and add the dependency
      try {
        validateDependency(dependency, context);
        dependencies.push(dependency);
      } catch {
        // Skip invalid dependencies silently
      }
    }
  }

  return dependencies;
};
