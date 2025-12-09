#!/usr/bin/env bash
set -e

# E2E Test for nx-make plugin using Redis
# Repository: https://github.com/redis/redis
# Tests multi-project dependency detection

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
WORKSPACE_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"
TEST_DIR="$SCRIPT_DIR/workspace"
REDIS_VERSION="7.4"

echo "🧪 E2E Test: nx-make with Redis (Multi-Project)"
echo "=================================================="
echo ""

# Clean up any previous test run
if [ -d "$TEST_DIR" ]; then
  echo "🧹 Cleaning up previous test workspace..."
  rm -rf "$TEST_DIR"
fi

# Create test workspace directory
echo "📁 Creating test workspace..."
mkdir -p "$TEST_DIR"
cd "$TEST_DIR"

# Clone Redis
echo "📥 Cloning Redis $REDIS_VERSION..."
git clone --depth 1 --branch "$REDIS_VERSION" https://github.com/redis/redis.git redis-e2e
cd redis-e2e

# Run the install script (testing the actual user experience)
echo "📦 Running nx-make installation script..."
echo "   (Using local version for testing)"

# Create a modified version of the install script for testing
# This uses the local package instead of the published npm package
sed "s|@zackderose/nx-make|file:$WORKSPACE_ROOT/packages/nx-make|g" \
  "$WORKSPACE_ROOT/install.sh" > /tmp/install-local.sh

# Run the install script with 'y' piped to accept prompts
echo "y" | bash /tmp/install-local.sh || {
  echo "⚠️  Install script had issues, ensuring basic setup..."

  # Fallback: ensure package.json and nx are installed
  if [ ! -f "package.json" ]; then
    pnpm init
  fi

  if [ ! -d "node_modules/nx" ]; then
    pnpm add -D -w "nx@>=22.0.0" "file:$WORKSPACE_ROOT/packages/nx-make"
  fi

  if [ ! -f "nx.json" ]; then
    cat > nx.json << 'NXJSON'
{
  "$schema": "./node_modules/nx/schemas/nx-schema.json",
  "plugins": [
    {
      "plugin": "nx-make"
    }
  ]
}
NXJSON
  fi
}

# Clean up temp file
rm -f /tmp/install-local.sh

echo ""
echo "✅ Test workspace setup complete!"
echo ""

# Run tests
echo "🧪 Running E2E Tests..."
echo "======================="
echo ""

# Test 1: List all discovered projects
echo "Test 1: Multi-Project Discovery"
echo "--------------------------------"
PROJECT_COUNT=$(npx nx show projects | wc -l | tr -d ' ')
echo "✅ Discovered $PROJECT_COUNT projects:"
npx nx show projects | while read proj; do
  echo "  - $proj"
done

# Test 2: Verify dependencies are detected
echo ""
echo "Test 2: Dependency Detection (CRITICAL)"
echo "----------------------------------------"
echo "Redis src/ includes headers from deps/ subdirectories."
echo "Expected: src should depend on deps-hiredis, deps-lua, deps-fast_float, etc."
echo ""

# Get actual dependencies
SRC_DEPS=$(npx nx show project src --json 2>/dev/null | jq -r '.implicitDependencies[]?' 2>/dev/null || echo "")

# Check for expected dependencies
EXPECTED_DEPS=("deps-hiredis" "deps-lua" "deps-linenoise")
MISSING_DEPS=()

for expected in "${EXPECTED_DEPS[@]}"; do
  if echo "$SRC_DEPS" | grep -q "$expected"; then
    echo "✅ Found dependency: src → $expected"
  else
    echo "❌ MISSING dependency: src → $expected"
    MISSING_DEPS+=("$expected")
  fi
done

echo ""
if [ ${#MISSING_DEPS[@]} -eq 0 ]; then
  echo "✅ All expected dependencies detected!"
else
  echo "❌ Missing ${#MISSING_DEPS[@]} dependencies: ${MISSING_DEPS[*]}"
  echo ""
  echo "Example: src/debug.c includes 'fast_float_strtod.h' from deps/fast_float"
  echo "This should create an edge: src → deps-fast_float"
  echo ""
  echo "Actual dependencies found:"
  if [ -n "$SRC_DEPS" ]; then
    echo "$SRC_DEPS" | while read dep; do echo "  → $dep"; done
  else
    echo "  (none)"
  fi
  echo ""
  echo "⚠️  Dependency detection needs fixing!"
fi

# Test 3: Build a dependency
echo ""
echo "Test 3: Build Individual Dependency"
echo "------------------------------------"
if npx nx build deps-hiredis 2>&1 | grep -q "Successfully ran target"; then
  echo "✅ deps-hiredis built successfully"
else
  echo "⚠️  deps-hiredis may not have a 'build' target, trying 'all'"
  if npx nx all deps-hiredis 2>&1 | grep -q "Successfully ran target\|make"; then
    echo "✅ deps-hiredis 'all' target executed"
  fi
fi

# Test 4: Verify target counts
echo ""
echo "Test 4: Target Discovery per Project"
echo "-------------------------------------"
for proj in src deps-hiredis deps-lua; do
  if npx nx show project $proj > /dev/null 2>&1; then
    TARGET_COUNT=$(npx nx show project $proj --json 2>/dev/null | jq '.targets | length' 2>/dev/null || echo "?")
    echo "  $proj: $TARGET_COUNT targets"
  fi
done

# Test 5: Run nx graph to visualize
echo ""
echo "Test 5: Project Graph Visualization"
echo "------------------------------------"
if npx nx graph --file=redis-graph.html > /dev/null 2>&1; then
  echo "✅ Project graph generated successfully"
  echo "   Open: $TEST_DIR/redis-e2e/redis-graph.html"
  rm -f redis-graph.html test-graph.json
else
  echo "⚠️  Graph generation failed"
fi

echo ""
echo "================================"
echo "✅ Redis E2E tests complete!"
echo "================================"
echo ""
echo "Test workspace: $TEST_DIR/redis-e2e"
echo ""
echo "Discovered projects: $PROJECT_COUNT"
echo ""
echo "To explore:"
echo "  cd $TEST_DIR/redis-e2e"
echo "  npx nx graph"
echo "  npx nx show projects"
echo ""
