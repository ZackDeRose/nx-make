# nx-make Examples

This directory contains example projects demonstrating the nx-make plugin's capabilities.

## Projects

### 📚 math-lib
**Type**: Library
**Location**: `examples/math-lib`

A C static library providing mathematical operations:
- `multiply(a, b)` - Integer multiplication
- `power(base, exp)` - Integer exponentiation
- `divide(a, b)` - Floating-point division

**Build**:
```bash
nx build math-lib
```

**Output**: `examples/math-lib/dist/lib/libmath.a`

---

### 👋 hello-world
**Type**: Application
**Location**: `examples/hello-world`
**Dependencies**: math-lib

A C application that demonstrates:
- Using the math-lib library
- Make-based dependency management
- Nx project dependencies

**Commands**:
```bash
# Build (automatically builds math-lib first)
nx build hello-world

# Run
nx run hello-world

# Test
nx test hello-world

# Serve (watch mode with auto-rebuild)
nx serve hello-world

# Clean
nx clean hello-world
```

**Output**:
```
Hello, World from nx-make!
Math demo: 5 * 3 = 15
Math demo: 2^8 = 256
Math demo: 10 / 4 = 2.50
```

---

## Key Demonstrations

### 1. Multi-Project Workspace
The examples show how nx-make handles multiple C projects in a monorepo:
- Library projects (math-lib)
- Application projects (hello-world)
- Dependencies between projects

### 2. Make Dependency Management
The hello-world `Makefile` references math-lib:
```makefile
MATH_LIB_DIR = ../math-lib
MATH_LIB = $(MATH_LIB_DIR)/dist/lib/libmath.a

# Ensure math-lib is built
$(MATH_LIB):
	@$(MAKE) -C $(MATH_LIB_DIR) build
```

When you build hello-world, Make automatically builds math-lib if needed.

### 3. Nx Dependency Graph Integration
The dependency is declared in `hello-world/project.json`:
```json
{
  "implicitDependencies": ["math-lib"]
}
```

This allows Nx to:
- Understand the project relationship
- Run affected commands correctly
- Cache builds intelligently
- Visualize the dependency graph

**View the graph**:
```bash
nx graph
```

### 4. Automatic Serve Target
Both projects automatically get a `serve` target because they have:
- A `build` target (to compile)
- A `run` target (hello-world only, applications)

The serve target uses `nx watch` to automatically rebuild and rerun on file changes.

### 5. Incremental Builds
Make's built-in dependency tracking ensures:
- Only changed `.c` files are recompiled
- Libraries are only rebuilt when their source changes
- Fast iteration during development

---

## Workflow Example

```bash
# Initial build - builds everything
nx build hello-world
# Output: Builds math-lib, then hello-world

# Modify math-lib source
echo '// comment' >> examples/math-lib/math_ops.c

# Rebuild hello-world
nx build hello-world
# Output: Only rebuilds math-lib (changed), then relinks hello-world

# Modify hello-world source only
echo '// comment' >> examples/hello-world/hello.c

# Rebuild
nx build hello-world
# Output: Only recompiles hello.c, doesn't touch math-lib

# Development workflow
nx serve hello-world
# Edit files, see changes automatically compiled and executed
```

---

## Project Structure

```
examples/
├── math-lib/               # C static library
│   ├── math_ops.h         # Public header
│   ├── math_ops.c         # Implementation
│   ├── Makefile           # Build configuration
│   └── project.json       # Nx project metadata
│
└── hello-world/           # C application
    ├── main.c             # Entry point
    ├── hello.c            # Uses math-lib functions
    ├── hello.h            # Local header
    ├── test.c             # Unit tests
    ├── Makefile           # Build config with math-lib dependency
    └── project.json       # Nx project metadata (depends on math-lib)
```

---

## Adding New Projects

To add a new C project:

1. **Create project directory**:
   ```bash
   mkdir -p examples/my-project
   ```

2. **Add Makefile** with standard targets:
   - `build` - Compile the project
   - `run` (optional) - Execute (for applications)
   - `test` - Run tests
   - `clean` - Remove build artifacts

3. **Add project.json**:
   ```json
   {
     "name": "my-project",
     "$schema": "../../node_modules/nx/schemas/project-schema.json",
     "sourceRoot": "examples/my-project",
     "projectType": "library" or "application"
   }
   ```

4. **Add dependencies** (if needed):
   ```json
   {
     "implicitDependencies": ["other-project"]
   }
   ```

5. **Run `nx reset`** to refresh the project graph

The nx-make plugin will automatically:
- Discover your Makefile
- Create Nx targets for each Make target
- Add a `serve` target (if applicable)
- Integrate with Nx caching and dependency management

---

## Learn More

- [Nx Documentation](https://nx.dev)
- [nx-make Plugin README](../packages/nx-make/README.md)
- [GNU Make Manual](https://www.gnu.org/software/make/manual/)
