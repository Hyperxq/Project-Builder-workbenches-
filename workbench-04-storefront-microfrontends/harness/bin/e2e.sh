#!/usr/bin/env bash
# Usage: e2e.sh <base-repo>
# Serves every project of <base-repo> HEAD in a fresh container and leaves it running
# as pb-e2e, with the shell, the gateway and the providers published on localhost.
set -euo pipefail

base=$1
image=${IMAGE:-pb-runner:2.1.308}
name=pb-e2e
dir=/home/node/work/repo

docker rm -f "$name" > /dev/null 2>&1 || true
docker run -d --name "$name" -p 4200:4200 -p 3000:3000 -p 3101-3103:3101-3103 "$image" sleep infinity > /dev/null
git -C "$base" archive HEAD | docker exec -i "$name" tar -x -C "$dir"
docker exec "$name" sh -c 'npm ci --no-audit --no-fund > /tmp/npm-ci.log 2>&1 || { tail -20 /tmp/npm-ci.log; exit 1; }'

# Dev servers bind 0.0.0.0 so the published ports reach them from the host.
projects=${PROJECTS:-catalog-service,cart-service,orders-service,gateway,catalog,cart,orders,shell}
docker exec -d -e HOST=0.0.0.0 "$name" sh -c "npx nx run-many -t serve --parallel=20 -p $projects > /tmp/serve.log 2>&1"

for port in 3000 ${WAIT_PORTS:-3101 3102 3103} 4200; do
  for _ in $(seq 1 90); do
    docker exec "$name" sh -c "curl -s -o /dev/null http://localhost:$port" && break
    sleep 2
  done
done
echo ready
