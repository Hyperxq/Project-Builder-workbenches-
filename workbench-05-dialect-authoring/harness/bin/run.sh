#!/usr/bin/env bash
# Usage: ARM=a|b run.sh <run-id>
# One headless agent in a fresh container: the base plus the arm's delta, no history.
# The agent authors the four schematics; check.sh then scores them on clean copies.
# Arm a edits with @pbuilder/sdk/commons only; arm b uses the dialects and dialects.md.
set -euo pipefail

run_id=$1
wb=$(cd "$(dirname "$0")/../.." && pwd)
arm=${ARM:?set ARM=a or ARM=b}
case $arm in
  a) delta=without-dialects ;;
  b) delta=with-dialects ;;
  *) echo "ARM must be a or b" >&2; exit 1 ;;
esac
image=${IMAGE:-claude-runner-runner-web:latest}
model=${MODEL:-claude-opus-5-5}
budget=${BUDGET_USD:-20}
logs=${RUNS_DIR:-$HOME/pb-experiment/wb05/runs}/$run_id
name=pb-wb05-$run_id
repo=/home/agent/repo

[[ -e $logs ]] && { echo "run $run_id already exists" >&2; exit 1; }
mkdir -p "$logs"

docker run -d --name "$name" --entrypoint sleep "$image" infinity > /dev/null
trap 'docker rm -f "$name" > /dev/null' EXIT

docker exec "$name" mkdir -p "$repo" /home/agent/checker
tar -c -C "$wb/base" . | docker exec -i "$name" tar -x -C "$repo"
tar -c -C "$wb/deltas/$delta" . | docker exec -i "$name" tar -x -C "$repo"
# Dependencies install before the clock starts; the history-free commit is the base check.sh restores.
docker exec -w "$repo" "$name" sh -c 'pnpm install --frozen-lockfile > /tmp/install.log 2>&1 || { tail -20 /tmp/install.log; exit 1; }'
docker exec -w "$repo" "$name" sh -c 'git init -q && git add -A && git -c user.name=base -c user.email=base@local commit -qm base && git tag base'
echo "$arm" > "$logs/arm"

start=$(date +%s)
ANTHROPIC_API_KEY="$(security find-generic-password -s anthropic-api-key -w)" \
  docker exec -i -w "$repo" -e ANTHROPIC_API_KEY "$name" \
    claude -p --bare --verbose \
      --model "$model" \
      --max-budget-usd "$budget" \
      --output-format stream-json \
      --dangerously-skip-permissions \
      --append-system-prompt "$(cat "$wb/harness/arms/arm-$arm.md")" \
  < "$wb/harness/tasks/author-registration-schematics.md" > "$logs/stream.jsonl" 2> "$logs/stderr.log" \
  || echo "agent exited $?" >> "$logs/stderr.log"
echo $(( $(date +%s) - start )) > "$logs/wall_seconds"
tail -n 1 "$logs/stream.jsonl" > "$logs/result.json"

docker exec -w "$repo" "$name" git add -A
docker exec -w "$repo" "$name" git diff --cached --stat base > "$logs/diffstat.txt"
docker exec -w "$repo" "$name" git diff --cached base > "$logs/diff.patch"
# Protocol compliance: which SDK entry points the authored factories import.
docker exec -w "$repo" "$name" sh -c "grep -rhoE \"@pbuilder/sdk/[a-z]+\" schematics --include='*.ts' | sort | uniq -c" > "$logs/sdk-imports.txt" || true

tar -c -C "$wb/harness/checker" . | docker exec -i "$name" tar -x -C /home/agent/checker
docker exec "$name" bash /home/agent/checker/check.sh "$repo" /home/agent/checker /home/agent/out | tee "$logs/check-summary.json"
docker exec "$name" tar -c -C /home/agent/out . | tar -x -C "$logs"
