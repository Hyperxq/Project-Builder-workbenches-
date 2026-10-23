#!/usr/bin/env bash
# Usage: run.sh <run-id> <base-repo> <task-file> [extra claude args...]
# Snapshots HEAD of <base-repo> without history into a fresh container, runs one
# headless agent there, then records the agent result, the diff and the root checks.
# The container is the isolation boundary: it holds nothing but the snapshot.
set -euo pipefail

run_id=$1 base=$2 task=$3
shift 3

protocol=$HOME/pb-experiment/protocol
arm=${ARM:-none}
arm_args=()
case $arm in
  none) image=pb-runner:2.1.308 ;;
  a) image=pb-runner:2.1.308
     arm_args=(--append-system-prompt "$(cat "$protocol/arms/arm-a.md")" --disallowedTools "Bash(builder:*)") ;;
  b) image=pb-runner-b:2.1.308
     arm_args=(--append-system-prompt "$(cat "$protocol/arms/arm-b.md")") ;;
  *) echo "ARM must be none, a or b" >&2; exit 1 ;;
esac
model=${MODEL:-claude-sonnet-5-5}
budget=${BUDGET_USD:-20}
name=pb-$run_id
out=$HOME/pb-runs/$run_id
logs=$HOME/pb-experiment/runs/$run_id
dir=/home/node/work/repo

[[ -e $out || -e $logs ]] && { echo "run $run_id already exists" >&2; exit 1; }
mkdir -p "$out" "$logs"

docker run -d --name "$name" "$image" sleep infinity > /dev/null
trap 'docker rm -f "$name" > /dev/null' EXIT

git -C "$base" archive HEAD | docker exec -i "$name" tar -x -C "$dir"
# Host node_modules hold darwin binaries, so the container installs its own before the clock starts.
docker exec "$name" sh -c 'npm ci --no-audit --no-fund > /tmp/npm-ci.log 2>&1 || { tail -20 /tmp/npm-ci.log; exit 1; }'
docker exec "$name" sh -c 'git init -q && git add -A && git commit -qm base && git tag base'
if [[ $arm == b ]]; then
  # The manifest sits outside the repository, where BUILDER_MANIFEST points in the arm B image.
  tar -c -C "$protocol/schematics" project-builder.json schematics | docker exec -i "$name" sh -c 'mkdir -p /home/node/schematics && tar -x -C /home/node/schematics'
fi
echo "$arm" > "$logs/arm"

start=$(date +%s)
ANTHROPIC_API_KEY="$(security find-generic-password -s anthropic-api-key -w)" \
  docker exec -i -e ANTHROPIC_API_KEY "$name" \
    claude -p --bare --verbose \
      --model "$model" \
      --max-budget-usd "$budget" \
      --output-format stream-json \
      --dangerously-skip-permissions \
      "${arm_args[@]}" \
      "$@" \
  < "$task" > "$logs/stream.jsonl" 2> "$logs/stderr.log" || echo "agent exited $?" >> "$logs/stderr.log"
echo $(( $(date +%s) - start )) > "$logs/wall_seconds"

tail -n 1 "$logs/stream.jsonl" > "$logs/result.json"
docker exec "$name" git add -A
docker exec "$name" git diff --cached --stat base > "$logs/diffstat.txt"
docker exec "$name" git diff --cached base > "$logs/diff.patch"

for check in lint typecheck test; do
  if docker exec "$name" npm run "$check" > "$logs/check-$check.log" 2>&1; then
    echo "$check pass" >> "$logs/checks.txt"
  else
    echo "$check FAIL" >> "$logs/checks.txt"
  fi
done

docker exec "$name" tar -c --exclude=node_modules --exclude=.nx -C "$dir" . | tar -x -C "$out"

# The image sets CI=true, under which Nx does not fail tasks on stale project references.
if docker exec "$name" npx nx sync:check > "$logs/check-sync.log" 2>&1; then
  echo "sync pass" >> "$logs/checks.txt"
else
  echo "sync FAIL" >> "$logs/checks.txt"
fi

cat "$logs/checks.txt"
jq -c '{subtype, is_error, num_turns, duration_ms, total_cost_usd, usage}' "$logs/result.json" || cat "$logs/result.json"
