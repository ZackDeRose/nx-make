# E2E Tests

End-to-end tests that validate the nx-make plugin against real-world open-source C projects.

## Running Tests

```bash
# Run all e2e tests
./e2e/cjson-test/test.sh

# Clean up test workspaces
rm -rf e2e/*/workspace
```

## Test Projects

### cJSON Test

**Status**: ✅ Passing
**Target**: [DaveGamble/cJSON v1.7.18](https://github.com/DaveGamble/cJSON)
**Purpose**: Validates plugin against a real-world C library

**What it tests**:
1. ✅ Project discovery from Makefile
2. ✅ Target extraction (13 targets discovered)
3. ✅ Build execution (`nx all cJSON`)
4. ✅ Build artifacts verification
5. ✅ Clean execution

**Results**:
- Discovered 13 Make targets from cJSON's Makefile
- Successfully built shared libraries (.dylib)
- Successfully built static libraries (.a)
- Created object files and test executable
- Clean target works correctly

See [cjson-test/README.md](./cjson-test/README.md) for details.

## Test Results Summary

| Test | Project | Targets | Build | Status |
|------|---------|---------|-------|--------|
| cJSON | v1.7.18 | 13 | ✅ | ✅ Passing |

## Adding New E2E Tests

To add a new e2e test:

1. Create a new directory: `e2e/project-name-test/`
2. Add `test.sh` script following the cJSON pattern
3. Add `README.md` documenting the test
4. Update this file with the new test

## CI Integration

These tests can be run in CI to validate the plugin against real-world projects:

```yaml
# .github/workflows/e2e.yml
- name: Run E2E Tests
  run: |
    ./e2e/cjson-test/test.sh
```
