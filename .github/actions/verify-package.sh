#!/bin/bash
set -e

echo "Verifying package files and structure..."

# Verify lib directory exists
if [ ! -d "./lib" ]; then
  echo "ERROR: lib directory doesn't exist. Build may have failed."
  exit 1
fi

# Check for compiled index.js file
if [ ! -f "./lib/index.js" ]; then
  echo "ERROR: lib/index.js doesn't exist. TypeScript compilation may have failed."
  exit 1
fi

# Check for required exports from package.json
EXPORTS=$(jq -r '.exports | keys | length' package.json)
if [ "$EXPORTS" -lt 1 ]; then
  echo "ERROR: No exports found in package.json"
  exit 1
fi

# Verify package.json has name, version and publishConfig
NAME=$(jq -r '.name' package.json)
VERSION=$(jq -r '.version' package.json)
REGISTRY=$(jq -r '.publishConfig.registry' package.json)

if [[ "$NAME" != "@"* ]]; then
  echo "ERROR: Package name ($NAME) doesn't have proper scope"
  exit 1
fi

if [[ -z "$VERSION" || "$VERSION" == "null" ]]; then
  echo "ERROR: Package version is missing"
  exit 1
fi

if [[ -z "$REGISTRY" || "$REGISTRY" == "null" ]]; then
  echo "ERROR: publishConfig.registry is missing"
  exit 1
fi

# Verify README has been copied
if [ ! -f "./README.md" ]; then
  echo "WARN: README.md not found. Copying from parent directory..."
  cp ../README.md .
fi

echo "Package verification passed!" 