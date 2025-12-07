#!/usr/bin/env bash
set -e

# E2E Test for nx-make plugin using real-world cJSON library
# Repository: https://github.com/DaveGamble/cJSON
# Target commit: v1.7.18 (stable release)

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
WORKSPACE_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"
TEST_DIR="$SCRIPT_DIR/workspace"
CJSON_COMMIT="v1.7.18"

echo "🧪 E2E Test: nx-make with cJSON library"
echo "=========================================="
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

# Clone cJSON library first
echo "📥 Cloning cJSON at commit $CJSON_COMMIT..."
git clone https://github.com/DaveGamble/cJSON.git cjson-e2e
cd cjson-e2e
git checkout "$CJSON_COMMIT"

# Install Nx and nx-make plugin
echo "📦 Installing Nx and nx-make plugin..."
pnpm init
pnpm add -D nx "file:$WORKSPACE_ROOT/packages/nx-make"

# Create nx.json configuration
echo "⚙️  Creating nx.json..."
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

# No need for project.json! The plugin auto-detects projects from Makefiles
echo "✨ Plugin will auto-discover project from Makefile..."

# Reset Nx cache to discover the project
echo "🔄 Resetting Nx cache..."
npx nx reset

echo ""
echo "✅ Test workspace setup complete!"
echo ""

# Run tests
echo "🧪 Running E2E Tests..."
echo "======================="
echo ""

# Test 1: Verify project is discovered (auto-named from directory)
echo "Test 1: Project Discovery"
echo "-------------------------"
# The project will be named after the directory (cjson-e2e or root)
PROJECT_NAME=$(npx nx show projects | grep -v "^$" | head -1)
if [ -n "$PROJECT_NAME" ]; then
  echo "✅ Project discovered: $PROJECT_NAME (auto-named from Makefile location)"
else
  echo "❌ No project discovered"
  exit 1
fi

# Test 2: Verify Make targets are discovered
echo ""
echo "Test 2: Target Discovery"
echo "-------------------------"
TARGETS=$(npx nx show project $PROJECT_NAME --json | grep -o '"[^"]*":{"executor":"nx-make:make"' | grep -o '"[^"]*"' | head -1 | tr -d '"')
if [ -n "$TARGETS" ]; then
  echo "✅ Make targets discovered from Makefile"
  npx nx show project $PROJECT_NAME --json | grep '"executor":"nx-make:make"' | head -5
else
  echo "❌ No Make targets discovered"
  exit 1
fi

# Test 3: List all discovered targets
echo ""
echo "Test 3: Available Targets"
echo "-------------------------"
npx nx show project $PROJECT_NAME --json | jq -r '.targets | keys[]' | while read target; do
  echo "  - $target"
done

# Test 4: Build the library
echo ""
echo "Test 4: Build Execution"
echo "-------------------------"
if npx nx all $PROJECT_NAME 2>&1 | grep -q "Successfully ran target"; then
  echo "✅ Build succeeded (using 'all' target)"
else
  echo "❌ Build failed"
  exit 1
fi

# Test 5: Verify build artifacts
echo ""
echo "Test 5: Build Artifacts"
echo "-------------------------"
if [ -f "libcjson.a" ] || [ -f "libcjson.dylib" ] || ls *.o > /dev/null 2>&1; then
  echo "✅ Build artifacts created:"
  ls -lh lib*.{a,dylib} 2>/dev/null | awk '{print "  - " $9 " (" $5 ")"}'
  ls *.o 2>/dev/null | wc -l | xargs echo "  - Object files:"
else
  echo "⚠️  Build artifacts not found"
  exit 1
fi

# Test 6: Clean
echo ""
echo "Test 6: Clean Execution"
echo "-------------------------"
if npx nx clean $PROJECT_NAME 2>&1 | grep -q "Successfully ran target"; then
  echo "✅ Clean succeeded"
else
  echo "⚠️  Clean target may not exist"
fi

echo ""
echo "================================"
echo "✅ All E2E tests passed!"
echo "================================"
echo ""
echo "Test workspace location: $TEST_DIR/cjson-e2e"
echo "To explore manually:"
echo "  cd $TEST_DIR/cjson-e2e"
echo "  npx nx graph"
echo ""
