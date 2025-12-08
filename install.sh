#!/usr/bin/env bash
set -e

# nx-make Installation Script
# Adds Nx and nx-make to an existing C/Make project
# Usage: curl -fsSL https://raw.githubusercontent.com/ZackDeRose/nx-make/main/install.sh | bash

BOLD='\033[1m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

echo ""
echo -e "${BOLD}🚀 nx-make Installation Script${NC}"
echo -e "${BOLD}================================${NC}"
echo ""
echo "This will add Nx and nx-make to your existing C/Make project."
echo ""

# Check if we're in a git repository
if [ ! -d ".git" ]; then
  echo -e "${RED}❌ Error: Not in a git repository${NC}"
  echo "Please run this script from the root of your project."
  exit 1
fi

# Check for Makefiles
if ! find . -maxdepth 3 -name "Makefile" -type f | grep -q .; then
  echo -e "${YELLOW}⚠️  Warning: No Makefiles found in the current directory or subdirectories.${NC}"
  echo "nx-make works best with projects that use Makefiles."
  read -p "Continue anyway? (y/N) " -n 1 -r
  echo
  if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo "Installation cancelled."
    exit 0
  fi
fi

# Check for Node.js
echo "🔍 Checking for Node.js..."
if ! command -v node &> /dev/null; then
  echo -e "${YELLOW}⚠️  Node.js is not installed${NC}"
  echo ""
  echo "Node.js is required for Nx and nx-make."
  echo ""
  echo "Installation options:"
  echo "  1. Install via nvm (recommended): https://github.com/nvm-sh/nvm"
  echo "  2. Install from nodejs.org: https://nodejs.org/"
  echo "  3. Install via package manager:"
  echo "     - macOS: brew install node"
  echo "     - Linux: sudo apt-get install nodejs npm"
  echo ""
  read -p "Would you like to install Node.js via nvm now? (y/N) " -n 1 -r
  echo
  if [[ $REPLY =~ ^[Yy]$ ]]; then
    echo "📦 Installing nvm..."
    curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.40.1/install.sh | bash

    # Load nvm
    export NVM_DIR="$HOME/.nvm"
    [ -s "$NVM_DIR/nvm.sh" ] && \. "$NVM_DIR/nvm.sh"

    echo "📦 Installing Node.js LTS..."
    nvm install --lts
    nvm use --lts
  else
    echo -e "${RED}Installation cancelled. Please install Node.js and try again.${NC}"
    exit 1
  fi
fi

NODE_VERSION=$(node --version)
echo -e "${GREEN}✅ Node.js ${NODE_VERSION} found${NC}"

# Check for package manager
echo ""
echo "🔍 Detecting package manager..."
PACKAGE_MANAGER=""

if command -v pnpm &> /dev/null; then
  PACKAGE_MANAGER="pnpm"
  echo -e "${GREEN}✅ Using pnpm${NC}"
elif command -v yarn &> /dev/null; then
  PACKAGE_MANAGER="yarn"
  echo -e "${GREEN}✅ Using yarn${NC}"
elif command -v npm &> /dev/null; then
  PACKAGE_MANAGER="npm"
  echo -e "${GREEN}✅ Using npm${NC}"
else
  echo -e "${RED}❌ No package manager found${NC}"
  exit 1
fi

# Check for existing nx.json
if [ -f "nx.json" ]; then
  echo ""
  echo -e "${YELLOW}⚠️  nx.json already exists${NC}"
  echo "It looks like Nx is already configured in this project."
  read -p "Continue and add nx-make plugin? (y/N) " -n 1 -r
  echo
  if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo "Installation cancelled."
    exit 0
  fi
  SKIP_NX_INIT=true
else
  SKIP_NX_INIT=false
fi

# Initialize Nx if needed
if [ "$SKIP_NX_INIT" = false ]; then
  echo ""
  echo "⚙️  Initializing Nx..."

  if ! command -v nx &> /dev/null; then
    echo "📦 Installing Nx..."
    $PACKAGE_MANAGER add -D nx
  fi
fi

# Install nx-make plugin
echo ""
echo "📦 Installing @zackderose/nx-make..."
if [ "$PACKAGE_MANAGER" = "pnpm" ]; then
  pnpm add -D @zackderose/nx-make
elif [ "$PACKAGE_MANAGER" = "yarn" ]; then
  yarn add -D @zackderose/nx-make
else
  npm install -D @zackderose/nx-make
fi

# Configure nx.json
echo ""
echo "⚙️  Configuring nx-make plugin..."

if [ "$SKIP_NX_INIT" = true ]; then
  # Update existing nx.json to add the plugin
  if command -v jq &> /dev/null; then
    # Use jq if available for safer JSON manipulation
    TMP_FILE=$(mktemp)
    jq '.plugins += [{"plugin": "@zackderose/nx-make"}]' nx.json > "$TMP_FILE"
    mv "$TMP_FILE" nx.json
    echo -e "${GREEN}✅ Added nx-make to existing nx.json${NC}"
  else
    echo -e "${YELLOW}⚠️  Please manually add the following to your nx.json plugins array:${NC}"
    echo '{"plugin": "@zackderose/nx-make"}'
  fi
else
  # Create new nx.json
  cat > nx.json << 'NXJSON'
{
  "$schema": "./node_modules/nx/schemas/nx-schema.json",
  "plugins": [
    {
      "plugin": "@zackderose/nx-make"
    }
  ]
}
NXJSON
  echo -e "${GREEN}✅ Created nx.json${NC}"
fi

# Check for gcc/clang
echo ""
echo "🔍 Checking for C compiler (for dependency detection)..."
if command -v gcc &> /dev/null; then
  GCC_VERSION=$(gcc --version | head -1)
  echo -e "${GREEN}✅ gcc found: ${GCC_VERSION}${NC}"
elif command -v clang &> /dev/null; then
  CLANG_VERSION=$(clang --version | head -1)
  echo -e "${GREEN}✅ clang found: ${CLANG_VERSION}${NC}"
  echo -e "${YELLOW}💡 Tip: Configure nx-make to use clang in nx.json:${NC}"
  echo '   "options": { "dependencyCompiler": "clang" }'
else
  echo -e "${YELLOW}⚠️  No C compiler found (gcc or clang)${NC}"
  echo "Dependency detection will use manual mode (less accurate)."
  echo ""
  echo "To install a compiler:"
  echo "  - macOS: xcode-select --install"
  echo "  - Linux: sudo apt-get install build-essential"
fi

# Update .gitignore
echo ""
echo "📝 Updating .gitignore..."

GITIGNORE_ENTRIES=(
  ""
  "# Nx"
  ".nx/cache"
  ".nx/workspace-data"
  ""
  "# Node.js"
  "node_modules/"
  ""
  "# Nx graph output"
  "graph.html"
  "*-graph.html"
  "static/"
)

# Create .gitignore if it doesn't exist
if [ ! -f ".gitignore" ]; then
  touch .gitignore
fi

# Check and add missing entries
for entry in "${GITIGNORE_ENTRIES[@]}"; do
  if [ -n "$entry" ] && ! grep -qF "$entry" .gitignore 2>/dev/null; then
    echo "$entry" >> .gitignore
  fi
done

echo -e "${GREEN}✅ Updated .gitignore with Nx patterns${NC}"

# Success!
echo ""
echo -e "${BOLD}${GREEN}✅ Installation Complete!${NC}"
echo ""
echo "nx-make has been added to your project."
echo ""
echo "🎯 Next Steps:"
echo ""
echo "1. Discover your Make projects:"
echo "   ${BOLD}nx show projects${NC}"
echo ""
echo "2. Run a Make target via Nx:"
echo "   ${BOLD}nx build <project-name>${NC}"
echo "   ${BOLD}nx test <project-name>${NC}"
echo ""
echo "3. Visualize your project graph:"
echo "   ${BOLD}nx graph${NC}"
echo ""
echo "4. Learn more:"
echo "   https://github.com/ZackDeRose/nx-make"
echo "   https://www.npmjs.com/package/@zackderose/nx-make"
echo ""
echo -e "${BOLD}Happy building! 🚀${NC}"
echo ""
