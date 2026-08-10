#!/bin/bash
set -euo pipefail

if [ ! -f .env ] && [ -f .env.example ]; then
  cp .env.example .env
fi

# Keep .env truthful inside the container: the arm's example points at
# localhost, but Mongo runs as a sibling compose service. Without this the
# agent trusts the stale URI and burns benchmark time hunting for a database
# that is already running.
if [ -n "${MONGODB_URI:-}" ] && [ -f .env ]; then
  sed -i "s|^MONGODB_URI=.*|MONGODB_URI=${MONGODB_URI}|" .env
  echo "MongoDB ready at ${MONGODB_URI} (compose service — no Docker needed in here)"
fi

# node_modules is an anonymous volume: host (macOS) binaries never leak in,
# and every `run --rm` starts from a clean install backed by the pnpm store.
# Postinstall scripts are safe to allow here — the container is disposable —
# and skipping them leaves native resolvers (unrs-resolver) half-installed.
pnpm install --frozen-lockfile --dangerously-allow-all-builds

exec "$@"
