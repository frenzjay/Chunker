#!/bin/bash
# Chunker Web Server Setup Script

set -e

echo "=========================================="
echo "Chunker Web Server Setup"
echo "=========================================="
echo ""

# Check for required tools
command -v node >/dev/null 2>&1 || { echo "Error: Node.js is required but not installed. Please install Node.js 18 or higher."; exit 1; }
command -v npm >/dev/null 2>&1 || { echo "Error: npm is required but not installed."; exit 1; }
command -v java >/dev/null 2>&1 || { echo "Error: Java is required but not installed. Please install Java 17 or higher."; exit 1; }

echo "✓ All required tools are installed"
echo ""

# Get the project root directory
PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
echo "Project root: $PROJECT_ROOT"
echo ""

# Build CLI
echo "Step 1/4: Building Chunker CLI..."
cd "$PROJECT_ROOT"
if [ ! -f "./gradlew" ]; then
    echo "Error: gradlew not found. Are you in the Chunker project directory?"
    exit 1
fi
chmod +x ./gradlew
./gradlew :cli:build -x test
echo "✓ CLI built successfully"
echo ""

# Build UI
echo "Step 2/4: Building React UI..."
cd "$PROJECT_ROOT/app/ui"
npm install
npm run build
echo "✓ UI built successfully"
echo ""

# Install web server dependencies
echo "Step 3/4: Installing web server dependencies..."
cd "$PROJECT_ROOT/app/web"
npm install
echo "✓ Dependencies installed"
echo ""

# Find CLI jar
CLI_JAR=$(find "$PROJECT_ROOT/cli/build/libs" -name "chunker-cli*.jar" ! -name "*unshaded*" | head -n 1)
if [ -z "$CLI_JAR" ]; then
    echo "Error: Could not find CLI jar file"
    exit 1
fi

echo "Step 4/4: Configuration"
echo "✓ CLI found at: $CLI_JAR"
echo ""

echo "=========================================="
echo "Setup Complete!"
echo "=========================================="
echo ""
echo "To start the web server, run:"
echo "  cd $PROJECT_ROOT/app/web"
echo "  npm start"
echo ""
echo "Or with custom settings:"
echo "  PORT=8080 npm start"
echo ""
echo "Then open your browser to:"
echo "  http://localhost:3001 (or your custom port)"
echo ""
