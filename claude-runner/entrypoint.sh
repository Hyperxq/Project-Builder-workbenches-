#!/bin/bash
set -euo pipefail

if [ ! -f .env ] && [ -f .env.example ]; then
  cp .env.example .env
fi

# node_modules is an anonymous volume: host (macOS) binaries never leak in,
# and every `run --rm` starts from a clean install backed by the pnpm store.
pnpm install --frozen-lockfile

exec "$@"
