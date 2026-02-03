#!/bin/bash
# Copy all build files to root for GitHub Pages

cd "$(dirname "$0")"

# Copy static folder
cp -r build/static .

# Copy maskfrags and textures
cp -r build/maskfrags . 2>/dev/null || true
cp -r build/textures . 2>/dev/null || true

# Copy assets
cp build/favicon.ico . 2>/dev/null || true
cp build/logo192.png . 2>/dev/null || true
cp build/logo512.png . 2>/dev/null || true
cp build/manifest.json . 2>/dev/null || true

# Copy index.html
cp build/index.html index.html

echo "✓ All files copied to root"
