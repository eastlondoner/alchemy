#!/bin/bash
set -e

# This script properly builds the alchemy package for publishing to GitHub Packages

# Make sure TypeScript is installed and available
echo "Checking for TypeScript installation..."
if ! command -v tsc &> /dev/null; then
  echo "TypeScript not found, installing globally..."
  npm install -g typescript
fi

# Copy README from the root for publishing
cp ../README.md .

# Clean up previous build artifacts
rm -rf ./*.tsbuildinfo
rm -rf ./lib

# Build TypeScript
echo "Building TypeScript..."
# Try project-specific tsc first, fall back to global
if [ -f "../node_modules/.bin/tsc" ]; then
  echo "Using project TypeScript..."
  ../node_modules/.bin/tsc -b
else
  echo "Using global TypeScript..."
  tsc -b
fi

echo "Package built successfully and ready for publishing" 