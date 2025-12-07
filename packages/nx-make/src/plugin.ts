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

export interface MakePluginOptions {
  targetName?: string;
}

const MAKEFILE_GLOB = '**/Makefile';

/**
 * Parses a Makefile to extract target names
 */
function parseMakefile(makefilePath: string): string[] {
  if (!existsSync(makefilePath)) {
    return [];
  }

  const content = readFileSync(makefilePath, 'utf-8');
  const targets: string[] = [];

  // Match target definitions (lines that start with a word followed by a colon)
  // This is a simplified parser - real Makefiles can be more complex
  const targetRegex = /^([a-zA-Z0-9_-]+):/gm;
  const matches = content.matchAll(targetRegex);

  for (const match of matches) {
    const targetName = match[1];
    // Skip special targets and internal targets (starting with .)
    if (!targetName.startsWith('.') && !targetName.startsWith('_')) {
      targets.push(targetName);
    }
  }

  return targets;
}

/**
 * Scans C/H files in a directory for #include statements
 * Returns a map of include paths to the source file that includes them
 */
function scanForIncludes(projectDir: string, projectRoot: string): Map<string, string> {
  const includes: Map<string, string> = new Map();

  function scanDirectory(dir: string) {
    if (!existsSync(dir)) return;

    try {
      const entries = readdirSync(dir);

      for (const entry of entries) {
        const fullPath = join(dir, entry);
        const stat = statSync(fullPath);

        // Skip dist/build directories
        if (entry === 'dist' || entry === 'build' || entry === 'node_modules') {
          continue;
        }

        if (stat.isDirectory()) {
          scanDirectory(fullPath);
        } else if (entry.endsWith('.c') || entry.endsWith('.h')) {
          try {
            const content = readFileSync(fullPath, 'utf-8');
            // Match #include "..." or #include <...>
            const includeRegex = /#include\s+["<]([^">]+)[">]/g;
            const matches = content.matchAll(includeRegex);

            for (const match of matches) {
              const includePath = match[1];
              // Store the relative path from project root
              const relativeFilePath = fullPath.replace(projectDir + '/', '');
              const sourceFile = join(projectRoot, relativeFilePath);
              includes.set(includePath, sourceFile);
            }
          } catch (e) {
            // Skip files that can't be read
          }
        }
      }
    } catch (e) {
      // Skip directories that can't be read
    }
  }

  scanDirectory(projectDir);
  return includes;
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

  for (const makeTarget of makeTargets) {
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

    // Add target-level dependencies for build-like targets
    // Use ^build pattern which means "build target of dependencies"
    if (makeTarget === 'build' || makeTarget === 'compile' || makeTarget === 'all') {
      targetConfig.dependsOn = ['^build'];
    }

    targets[targetName] = targetConfig;
  }

  // Auto-generate serve target if both build/compile and run targets exist
  const hasBuildTarget = makeTargets.some(t =>
    t === 'build' || t === 'compile' || t === 'all'
  );
  const hasRunTarget = makeTargets.includes('run');

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
  _options: MakePluginOptions | undefined,
  context: CreateDependenciesContext
) => {
  const dependencies: RawProjectGraphDependency[] = [];

  // Analyze each project for C file includes
  for (const [projectName, projectConfig] of Object.entries(context.projects)) {
    const projectRoot = projectConfig.root || projectName;
    const projectAbsPath = join(context.workspaceRoot, projectRoot);

    // Scan for #include statements in this project (returns Map<includePath, sourceFile>)
    const includes = scanForIncludes(projectAbsPath, projectRoot);

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
