# E2E Test: cJSON Library

This end-to-end test validates the nx-make plugin against a real-world open-source C project.

## Test Target: cJSON

**Repository**: [DaveGamble/cJSON](https://github.com/DaveGamble/cJSON)
**Description**: Ultralightweight JSON parser in ANSI C
**Target Version**: v1.7.18
**Build System**: Makefile (deprecated in favor of CMake, but still functional)

### Why cJSON?

- ✅ Small and manageable (single C file + header)
- ✅ Uses Make for building
- ✅ Real-world library used in production
- ✅ Has multiple build targets (build, test, clean, install)
- ✅ Simple enough to verify behavior
- ✅ Good representative of C library projects

## Running the Test

```bash
# From repository root
./e2e/cjson-test/test.sh
```

## What the Test Does

### 1. Setup
- Creates a fresh Nx workspace
- Installs the nx-make plugin from local source
- Clones cJSON at v1.7.18
- Configures the project

### 2. Discovery Tests
- ✅ Verifies cJSON project is discovered
- ✅ Verifies Make targets are extracted from Makefile
- ✅ Lists all available targets

### 3. Execution Tests
- ✅ Runs `nx build cJSON`
- ✅ Verifies build artifacts are created
- ✅ Runs `nx clean cJSON`

### 4. Expected Targets

Based on cJSON's Makefile, we expect to see:
- `all` - Build everything
- `cjson` - Build the library
- `libcjson.so` - Build shared library
- `libcjson.a` - Build static library
- `test` - Run tests
- `clean` - Clean build artifacts
- `install` - Install library
- `uninstall` - Uninstall library

## Expected Output

```
✅ cJSON project discovered
✅ Make targets discovered from Makefile
✅ Build succeeded
✅ Build artifacts created
✅ All E2E tests passed!
```

## Test Workspace

The test creates a temporary workspace at `e2e/cjson-test/workspace/cjson-e2e/`

After running, you can explore it manually:
```bash
cd e2e/cjson-test/workspace/cjson-e2e
npx nx graph           # Visualize the project
npx nx build cJSON     # Build the library
npx nx test cJSON      # Run tests
```

## Cleanup

The test workspace can be safely deleted after testing:
```bash
rm -rf e2e/cjson-test/workspace
```

## What This Proves

This e2e test demonstrates that nx-make can:
1. Integrate with real-world C projects (not just our examples)
2. Parse actual Makefiles with complex targets
3. Execute Make commands successfully
4. Work with projects using standard C library patterns
5. Handle projects with both static and shared library builds

If this test passes, the plugin is ready for real-world usage!
