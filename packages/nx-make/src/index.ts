import type { NxPluginV2 } from '@nx/devkit';
import { createNodesV2, createDependencies } from './plugin';
import type { MakePluginOptions } from './plugin';

export type { MakePluginOptions } from './plugin';
export { makeExecutor } from './executors/make';
export type { MakeExecutorSchema } from './executors/make';

// Export individual functions for backwards compatibility
export { createNodesV2, createNodes, createDependencies } from './plugin';

// The main plugin export - this is what Nx loads
const nxPlugin: NxPluginV2<MakePluginOptions> = {
  name: 'nx-make',
  createNodesV2,
  createDependencies,
};

export default nxPlugin;
