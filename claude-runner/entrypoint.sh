#!/bin/bash
set -euo pipefail

if [ ! -f .env ] && [ -f .env.example ]; then
  cp .env.example .env
fi

# node_modules is an anonymous volume: host (macOS) binaries never leak in,
# and every `run --rm` starts from a clean install backed by the pnpm store.
# Postinstall scripts are safe to allow here — the container is disposable —
# and skipping them leaves native resolvers (unrs-resolver) half-installed.
pnpm install --frozen-lockfile --dangerously-allow-all-builds

exec "$@"
