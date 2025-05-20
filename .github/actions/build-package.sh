#!/bin/bash
set -e

# This script properly builds the alchemy package for publishing to GitHub Packages

# Copy README from the root for publishing
cp ../README.md .

# Clean up previous build artifacts
rm -rf ./*.tsbuildinfo
rm -rf ./lib

# Build TypeScript
echo "Building TypeScript..."
tsc -b

echo "Package built successfully and ready for publishing" 