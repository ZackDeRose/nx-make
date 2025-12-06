# Example C Project with nx-make

This is a real-world example demonstrating how `nx-make` integrates C projects with Makefiles into an Nx workspace.

## Project Structure

```
example-project/
├── main.c          # Main application entry point
├── hello.c         # Implementation of hello functions
├── hello.h         # Header file with function declarations
├── test.c          # Test suite
├── Makefile        # Build configuration
└── README.md       # This file
```

## Features

- **C11 Standard**: Modern C code with proper compiler flags
- **Modular Design**: Separated header and implementation files
- **Unit Tests**: Basic test suite with assertions
- **Build System**: Complete Makefile with multiple targets
- **Nx Integration**: All Make targets automatically available through Nx

## Building and Running

All commands use Nx, which automatically runs the corresponding Make targets:

### Build the Application

```bash
nx build example-project
```

This compiles the source files and creates the executable at `dist/bin/hello`.

### Run the Application

```bash
nx run example-project
```

Output: `Hello, World from nx-make!`

### Run Tests

```bash
nx test example-project
```

Runs the test suite and verifies the `add()` function works correctly.

### Clean Build Artifacts

```bash
nx clean example-project
```

Removes the `dist/` directory and all compiled files.

### View All Available Targets

```bash
nx show project example-project
```

### Get Help

```bash
nx run example-project:help
```

## What This Demonstrates

1. **Automatic Target Discovery**: The nx-make plugin automatically discovered all Make targets (build, test, run, clean, install, help) and made them available through Nx

2. **Proper Compilation**: The Makefile properly compiles C source files with warnings enabled and optimization flags

3. **Dependency Management**: Make handles incremental builds - only changed files are recompiled

4. **Test Integration**: Tests are compiled and run through the same workflow

5. **Nx Benefits**: You get all Nx features like caching, parallel execution, and dependency graph management for your C project

## Makefile Targets

The Makefile defines several targets:

- `build` (default): Compile the application with optimization
- `test`: Compile and run the test suite
- `run`: Build and execute the application
- `clean`: Remove all build artifacts
- `install`: Install dependencies (noop in this example)
- `help`: Display available targets
- `all`: Alias for `build`

## Compiler Settings

- **Compiler**: GCC (gcc)
- **Standard**: C11
- **Warnings**: `-Wall -Wextra` (all warnings enabled)
- **Optimization**: `-O2` for release builds
- **Debug Info**: `-g` for test builds

## How nx-make Works

1. The plugin scans for `Makefile` in the project directory
2. It parses the Makefile to find target definitions
3. For each target found, it creates an Nx target configuration
4. When you run `nx <target> example-project`, it executes `make <target>` in the project directory
5. Nx handles caching, logging, and integration with the project graph

## Next Steps

Try modifying the code and see how the incremental builds work:

```bash
# Modify hello.c
echo '// Modified' >> hello.c

# Only hello.c will be recompiled
nx build example-project

# Clean and rebuild everything
nx clean example-project
nx build example-project
```
