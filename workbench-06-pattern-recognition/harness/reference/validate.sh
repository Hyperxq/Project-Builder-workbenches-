#!/usr/bin/env bash
# Validates the checker without an agent: on a fresh container, the untouched base must
# fail T01, then the reference solution applied task by task must pass every task with
# no regressions. Prints one summary line per check. No API key, no paid call.
set -euo pipefail

wb=$(cd "$(dirname "$0")/../.." && pwd)
image=${IMAGE:-claude-runner-runner-web:latest}
name=pb-wb06-validate
repo=/home/agent/repo
out=${OUT:-$(mktemp -d)}
mkdir -p "$out"

docker run -d --name "$name" --entrypoint sleep "$image" infinity > /dev/null
trap 'docker rm -f "$name" > /dev/null' EXIT
docker exec "$name" mkdir -p "$repo" /home/agent/harness
tar -c -C "$wb/base" . | docker exec -i "$name" tar -x -C "$repo"
tar -c -C "$wb/harness" checker tasks reference | docker exec -i "$name" tar -x -C /home/agent/harness
docker exec -w "$repo" "$name" sh -c 'pnpm install --frozen-lockfile > /tmp/install.log 2>&1 || { tail -20 /tmp/install.log; exit 1; }'

check() { docker exec "$name" bash /home/agent/harness/checker/check-task.sh "$repo" /home/agent/harness/checker "$1" "/home/agent/out/$2"; }

echo "negative control: $(check T01 base)"
for task in $(python3 -I -c 'import json,sys; print(" ".join(t["id"] for t in json.load(open(sys.argv[1]))))' "$wb/harness/tasks/sequence.json"); do
  docker exec "$name" python3 -I /home/agent/harness/reference/solve.py "$repo" "$task"
  echo "reference: $(check "$task" "$task")"
done
docker exec "$name" tar -c -C /home/agent/out . | tar -x -C "$out"
echo "logs in $out"
