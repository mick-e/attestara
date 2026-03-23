#!/usr/bin/env bash
set -euo pipefail

echo "=== AgentClear Dev Setup ==="

echo "1. Installing dependencies..."
pnpm install

echo "2. Building types package..."
pnpm --filter @agentclear/types build

echo "3. Starting infrastructure..."
docker-compose -f infrastructure/docker-compose.yml up -d

echo "4. Compiling contracts..."
pnpm --filter @agentclear/contracts exec hardhat compile

echo "=== Setup complete! ==="
echo "Run 'pnpm dev' to start all services."
