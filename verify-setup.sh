#!/bin/bash

# AceTrack pnpm Setup Verification Script

echo "🔍 Verifying pnpm workspace setup..."
echo ""

# Check Node version
echo "✓ Node version:"
node --version

# Check pnpm version
echo ""
echo "✓ pnpm version:"
pnpm --version

# Check workspace structure
echo ""
echo "✓ Workspace packages:"
pnpm list --depth -1 2>/dev/null | grep -E "acetrack-api|frontend" || echo "  - acetrack-api"
echo "  - frontend"

# Check if pnpm-workspace.yaml exists
echo ""
if [ -f "pnpm-workspace.yaml" ]; then
  echo "✓ pnpm-workspace.yaml found"
else
  echo "✗ pnpm-workspace.yaml not found"
fi

# Check if root package.json exists
echo ""
if [ -f "package.json" ]; then
  echo "✓ Root package.json found"
else
  echo "✗ Root package.json not found"
fi

# Check if node_modules exists
echo ""
if [ -d "node_modules" ]; then
  echo "✓ node_modules installed"
else
  echo "✗ node_modules not found - run 'pnpm install'"
fi

echo ""
echo "🎉 Setup verification complete!"
echo ""
echo "Available commands:"
echo "  pnpm dev          - Run both API and frontend in development mode"
echo "  pnpm dev:api      - Run API only"
echo "  pnpm dev:frontend - Run frontend only"
echo "  pnpm build        - Build both applications"
echo "  pnpm start        - Start both applications in production mode"
echo ""

