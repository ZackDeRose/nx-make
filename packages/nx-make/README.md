# nx-make

An Nx plugin to integrate Make/Makefile tasks into the Nx dependency graph.

## Features

- 🔍 Automatically detects `Makefile`s in your workspace
- 📊 Integrates Make targets into the Nx project graph
- ⚡ Run Make targets using Nx executors
- 🔗 Leverage Nx caching and dependency management with your Make tasks
- 🎯 Simple configuration and setup

## Requirements

- **Node.js**: >= 18.0.0
- **Nx**: >= 22.0.0
- **C/C++ Compiler**: gcc or clang (for dependency detection)
  - Required for automatic dependency detection between projects
  - The plugin uses `gcc -MM` or `clang -MM` to analyze #include statements
  - Most systems with Make already have these installed

## Installation

### Quick Install (Recommended)

For existing C/Make projects, use the installation script:

```bash
curl -fsSL https://raw.githubusercontent.com/ZackDeRose/nx-make/main/install.sh | bash
```

This automated script will:
- ✅ Check for Node.js and offer to install via nvm
- ✅ Initialize Nx in your project
- ✅ Install @zackderose/nx-make
- ✅ Configure nx.json automatically
- ✅ Verify gcc/clang for dependency detection

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

### Verifying Requirements

```bash
# Check if gcc or clang is available
gcc --version
# or
clang --version

# If not installed, see installation instructions below
```

## Setup

### 1. Add the plugin to your `nx.json`

Add `nx-make` to the plugins array in your `nx.json`:

```json
{
  "plugins": [
    {
      "plugin": "nx-make"
    }
  ]
}
```

### 2. Create a Makefile

Create a `Makefile` in any project directory:

```makefile
.PHONY: build test clean

build:
	@echo "Building project..."
	# Your build commands here

test:
	@echo "Running tests..."
	# Your test commands here

clean:
	@echo "Cleaning..."
	# Your clean commands here
```

### 3. Discover targets

Run `nx show project <your-project>` to see the automatically discovered Make targets:

```bash
nx show project my-app
```

You should see targets like `build`, `test`, and `clean` that correspond to your Makefile targets.

## Usage

### Running Make Targets

Once configured, you can run Make targets using Nx:

```bash
nx build my-app
nx test my-app
```

Or run a specific Make target:

```bash
nx run my-app:build
```

### Plugin Configuration

You can configure the plugin in `nx.json`:

```json
{
  "plugins": [
    {
      "plugin": "nx-make",
      "options": {
        "targetName": "make",
        "dependencyCompiler": "gcc"
      }
    }
  ]
}
```

#### Options

- `targetName` (optional): Prefix for all Make targets. If set to `"make"`, targets will be named `make:build`, `make:test`, etc.

- `dependencyCompiler` (optional): Compiler to use for dependency detection. Options:
  - `"gcc"` (default): Use gcc -MM for dependency detection
  - `"clang"`: Use clang -MM for dependency detection
  - `"manual"`: Use regex-based parsing (fallback for environments without compilers)

  **Important**: The plugin will throw an error if the specified compiler is not installed.

  **Why this matters**:
  - gcc and clang may produce different dependency graphs due to different include paths
  - You should use the same compiler your project actually builds with
  - Manual mode is less accurate but works without a compiler

  **Default behavior**: Uses gcc. If your project uses clang, explicitly configure it.

### Executor Configuration

The plugin provides a `make` executor that you can use to run Make targets. Each discovered Makefile target automatically gets a target configuration, but you can also manually configure targets in your `project.json`:

```json
{
  "targets": {
    "custom-build": {
      "executor": "nx-make:make",
      "options": {
        "target": "build",
        "cwd": "my-app",
        "makeArgs": ["-j4"]
      }
    }
  }
}
```

#### Executor Options

- `target` (required): The Make target to execute
- `cwd` (optional): Working directory for the make command (relative to workspace root)
- `args` (optional): Additional arguments to pass to the make command
- `makeArgs` (optional): Make-specific arguments (e.g., `-j4` for parallel builds)

## How It Works

The plugin:

1. Scans your workspace for `Makefile`s
2. Parses each Makefile to extract target names
3. Creates Nx target configurations for each Make target
4. Executes Make targets using the provided executor

## Example Workspace Structure

```
my-workspace/
├── apps/
│   └── my-app/
│       ├── Makefile
│       └── src/
├── libs/
│   └── my-lib/
│       ├── Makefile
│       └── src/
├── nx.json
└── package.json
```

With this structure, `nx-make` will discover Makefiles in both `apps/my-app` and `libs/my-lib`, creating targets for each.

## Makefile Best Practices

For best integration with Nx:

1. **Use `.PHONY` targets**: Declare targets that don't produce files as `.PHONY`
   ```makefile
   .PHONY: build test clean
   ```

2. **Avoid internal targets**: The plugin skips targets starting with `.` or `_`
   ```makefile
   _internal:  # This will be skipped
   	@echo "Internal target"
   ```

3. **Use meaningful target names**: Target names become Nx target names

4. **Keep Makefiles focused**: One Makefile per project for clearer Nx integration

## Advanced Usage

### Parallel Execution

Leverage Nx's parallel execution capabilities:

```bash
nx run-many --target=build --all --parallel=3
```

### Caching

Configure Nx caching for your Make targets in `project.json`:

```json
{
  "targets": {
    "build": {
      "executor": "nx-make:make",
      "options": {
        "target": "build"
      },
      "cache": true,
      "inputs": ["default", "^default"],
      "outputs": ["{projectRoot}/dist"]
    }
  }
}
```

### Dependencies

Define dependencies between Make targets:

```json
{
  "targets": {
    "build": {
      "executor": "nx-make:make",
      "options": {
        "target": "build"
      },
      "dependsOn": ["^build"]
    }
  }
}
```

## Troubleshooting

### Targets not showing up

1. Ensure your Makefile is named exactly `Makefile` (case-sensitive)
2. Check that targets don't start with `.` or `_`
3. Run `nx reset` to clear the Nx cache
4. Verify the plugin is configured in `nx.json`

### Make command not found

Ensure `make` is installed on your system:

```bash
make --version
```

**macOS**: Make is included with Xcode Command Line Tools
```bash
xcode-select --install
```

**Linux**: Install via your package manager
```bash
# Debian/Ubuntu
sudo apt-get install build-essential

# Fedora
sudo dnf install make
```

**Windows**: Use WSL or install via Chocolatey
```bash
choco install make
```

## License

MIT

## Contributing

Contributions are welcome! Please open an issue or submit a pull request.

## Repository

https://github.com/ZackDeRose/nx-make
