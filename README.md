# nx-make

An Nx plugin to integrate Make/Makefile tasks into the Nx dependency graph.

## Overview

This repository contains the source code for the `nx-make` plugin, which enables seamless integration of Make-based build systems with Nx workspaces.

## Features

- 🔍 Automatically detects `Makefile`s in your workspace
- 📊 Integrates Make targets into the Nx project graph
- ⚡ Run Make targets using Nx executors
- 🔗 Leverage Nx caching and dependency management with your Make tasks
- 🎯 Simple configuration and setup

## Installation

### Quick Install (Recommended)

For existing C/Make projects, use the installation script:

```bash
curl -fsSL https://raw.githubusercontent.com/ZackDeRose/nx-make/main/install.sh | bash
```

This will:
- Check for Node.js and offer to install it
- Add Nx to your project
- Install @zackderose/nx-make
- Configure nx.json
- Verify gcc/clang availability

### Manual Installation

```bash
npm install -D @zackderose/nx-make
```

```bash
pnpm add -D @zackderose/nx-make
```

```bash
yarn add -D @zackderose/nx-make
```

## Quick Start

1. Add the plugin to your `nx.json`:

```json
{
  "plugins": [
    {
      "plugin": "nx-make"
    }
  ]
}
```

2. Create a `Makefile` in any project directory

3. Run `nx show project <your-project>` to see discovered Make targets

For complete documentation, see the [plugin README](packages/nx-make/README.md).

## Repository Structure

```
nx-make/
├── packages/
│   ├── nx-make/           # The nx-make plugin source code
│   └── example-project/   # Example project demonstrating the plugin
├── nx.json                # Nx workspace configuration
└── README.md             # This file
```

## Development

### Building the Plugin

```bash
nx build nx-make
```

### Testing the Plugin

The `example-project` demonstrates the plugin in action:

```bash
nx build example-project
nx test example-project
```

### Publishing

The plugin is configured for publishing to npm:

```bash
nx release
```

## Contributing

Contributions are welcome! Please open an issue or submit a pull request.

## License

MIT

## Author

Zack DeRose <zack.derose@gmail.com>

## Links

- [GitHub Repository](https://github.com/ZackDeRose/nx-make)
- [npm Package](https://www.npmjs.com/package/nx-make)
- [Nx Documentation](https://nx.dev)
