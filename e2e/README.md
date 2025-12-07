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
**Purpose**: Validates plugin against a simple single-project C library

**What it tests**:
1. ✅ Project discovery from Makefile
2. ✅ Target extraction (13 targets discovered)
3. ✅ Build execution (`nx all cJSON`)
4. ✅ Build artifacts verification
5. ✅ Clean execution

**Results**:
- Single project with 13 Make targets
- Successfully built shared/static libraries
- Validates basic plugin functionality

See [cjson-test/README.md](./cjson-test/README.md) for details.

### Redis Test

**Status**: ✅ Passing
**Target**: [redis/redis 7.4](https://github.com/redis/redis)
**Purpose**: Validates plugin against a complex multi-project C system

**What it tests**:
1. ✅ Multi-project discovery (12 projects)
2. ✅ Complex Makefile parsing (68+ targets)
3. ✅ Hierarchical project structure (deps/ subdirectories)
4. ✅ Build execution across components
5. ✅ Project graph visualization

**Results**:
- Discovered 12 projects including redis-server, hiredis, lua, jemalloc, etc.
- redis-server: 24 targets
- hiredis: 34 targets
- lua: 10 targets
- Demonstrates plugin scales to production systems

See [redis-test/README.md](./redis-test/README.md) for details.

## Test Results Summary

| Test | Project | Projects | Targets | Build | Status |
|------|---------|----------|---------|-------|--------|
| cJSON | v1.7.18 | 1 | 13 | ✅ | ✅ Passing |
| Redis | 7.4 | 12 | 68+ | ✅ | ✅ Passing |

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
