# E2E Test: Redis Multi-Project

This end-to-end test validates the nx-make plugin against Redis, a complex real-world C project with multiple components and dependencies.

## Test Target: Redis

**Repository**: [redis/redis](https://github.com/redis/redis)
**Description**: Real-time data store with cache, data structures, and query engine
**Target Version**: 7.4
**Build System**: Multiple Makefiles in hierarchical structure

### Why Redis?

- ✅ **Multi-project structure**: 12 projects discovered
- ✅ **Real dependencies**: hiredis, lua, jemalloc, linenoise, etc.
- ✅ **Complex Makefiles**: 24-34 targets per project
- ✅ **Production system**: Used by millions
- ✅ **Representative**: Shows plugin handles large-scale C projects

## Running the Test

```bash
# From repository root
./e2e/redis-test/test.sh
```

## Project Structure

Redis contains:
- **redis-server** (src/): Main Redis server - 24 targets
- **redis-deps** (deps/): Dependency coordinator
- **hiredis** (deps/hiredis/): Redis C client library - 34 targets
- **lua** (deps/lua/): Scripting engine - 10 targets
- **lua-src** (deps/lua/src/): Lua source compilation
- **lua-etc** (deps/lua/etc/): Lua configuration
- **jemalloc** (deps/jemalloc/): Memory allocator
- **linenoise** (deps/linenoise/): Line editing library
- **hdr_histogram** (deps/hdr_histogram/): Histogram library
- **fpconv** (deps/fpconv/): Float conversion
- **src-modules** (src/modules/): Redis modules
- **tests-modules** (tests/modules/): Module tests

## What the Test Validates

### 1. Multi-Project Discovery
- ✅ 12 projects discovered from Makefiles
- ✅ Hierarchical structure (deps/ subdirectories)
- ✅ Both libraries and applications

### 2. Target Discovery
- ✅ redis-server: 24 Make targets
- ✅ hiredis: 34 Make targets
- ✅ lua: 10 Make targets
- ✅ Total: 68+ targets across all projects

### 3. Build Execution
- ✅ Individual deps can be built: `nx all hiredis`
- ✅ Targets execute through Nx
- ✅ Make commands work correctly

### 4. Project Graph
- ✅ Graph visualization generated
- ✅ All 12 projects visible
- ✅ Demonstrates plugin scales to complex projects

## Expected Targets (Examples)

**redis-server**: all, install, uninstall, clean, test, etc.
**hiredis**: all, static, dynamic, clean, install, test, etc.
**lua**: all, clean, install, echo, etc.

## Test Scenarios

### Scenario 1: Build Individual Component
```bash
cd e2e/redis-test/workspace/redis-e2e
nx all hiredis
# Builds just the hiredis library
```

### Scenario 2: View All Projects
```bash
nx show projects
# Lists all 12 discovered projects
```

### Scenario 3: Visualize Graph
```bash
nx graph
# Shows all 12 projects and their relationships
```

## What This Proves

This test demonstrates that nx-make can:

1. **Handle Complex Projects**: Redis is a production system with sophisticated build requirements
2. **Discover Multiple Projects**: 12 projects from one repository
3. **Parse Complex Makefiles**: 68+ targets across various Makefiles
4. **Scale**: Works with large codebases, not just toy examples
5. **Real-World Integration**: Shows how to add Nx to existing C/Make projects

## Comparison with cJSON Test

| Aspect | cJSON | Redis |
|--------|-------|-------|
| Projects | 1 | 12 |
| Targets | ~13 | 68+ |
| Complexity | Simple | Complex |
| Purpose | Single library | Multi-component system |
| Use Case | Basic plugin validation | Multi-project validation |

Together, these tests provide comprehensive coverage from simple single-project libraries to complex multi-component systems!

## Cleanup

```bash
rm -rf e2e/redis-test/workspace
```
