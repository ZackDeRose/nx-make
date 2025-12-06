import type { ExecutorContext } from '@nx/devkit';
import { logger } from '@nx/devkit';
import { execSync } from 'node:child_process';
import { join } from 'node:path';

export interface MakeExecutorSchema {
  target: string;
  cwd?: string;
  args?: string[];
  makeArgs?: string[];
}

export default async function makeExecutor(
  options: MakeExecutorSchema,
  context: ExecutorContext
): Promise<{ success: boolean }> {
  const projectName = context.projectName;
  const projectRoot = projectName
    ? context.projectGraph?.nodes[projectName]?.data?.root
    : undefined;
  const workspaceRoot = context.root;

  // Determine the working directory
  const cwd = options.cwd
    ? join(workspaceRoot, options.cwd)
    : projectRoot
    ? join(workspaceRoot, projectRoot)
    : workspaceRoot;

  // Build the make command
  const makeCommand = ['make', options.target];

  if (options.makeArgs && options.makeArgs.length > 0) {
    makeCommand.push(...options.makeArgs);
  }

  if (options.args && options.args.length > 0) {
    makeCommand.push(...options.args);
  }

  const command = makeCommand.join(' ');

  logger.info(`Executing: ${command}`);
  logger.info(`Working directory: ${cwd}`);

  try {
    execSync(command, {
      cwd,
      stdio: 'inherit',
      encoding: 'utf-8',
    });

    return { success: true };
  } catch (error) {
    logger.error(`Failed to execute make target: ${options.target}`);
    if (error instanceof Error) {
      logger.error(error.message);
    }
    return { success: false };
  }
}
