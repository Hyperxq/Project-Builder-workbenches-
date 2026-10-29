#!/usr/bin/env bash
# Usage: run-sequence.sh exp2|by-hand|catalog <sequence-id>
# One sequence: a fresh container with the base, then one headless session per task in
# harness/tasks/sequence.json order. No session sees another's conversation; each finds
# the repository as the last one left it, committed. After each session the checker
# scores the task, and the session's diff and schematics are kept.
#   exp2     experiment 2: the shipped pbuilder skill, no schematic registered
#   by-hand  experiment 3, arm A: no pbuilder skill and no builder binary
#   catalog  experiment 3, arm B: harness/exp3/catalog registered in the repository
set -euo pipefail

condition=$1 seq_id=$2
wb=$(cd "$(dirname "$0")/../.." && pwd)
image=${IMAGE:-claude-runner-runner-web:latest}
model=${MODEL:-claude-opus-5-5}
budget=${BUDGET_USD:-10}
case $condition in
  exp2) context=$wb/harness/exp2/context.md experiment=exp2 ;;
  by-hand) context=$wb/harness/exp3/context-by-hand.md experiment=exp3 ;;
  catalog) context=$wb/harness/exp3/context-catalog.md experiment=exp3 ;;
  *) echo "condition must be exp2, by-hand or catalog" >&2; exit 1 ;;
esac
logs=${RUNS_DIR:-$HOME/pb-experiment/wb06/$experiment}/$seq_id
name=pb-wb06-$seq_id
repo=/home/agent/repo
git_as=(-c user.name=sequence -c user.email=sequence@local)

[[ -e $logs ]] && { echo "sequence $seq_id already exists" >&2; exit 1; }
mkdir -p "$logs"

docker run -d --name "$name" --entrypoint sleep "$image" infinity > /dev/null
trap 'docker rm -f "$name" > /dev/null' EXIT

docker exec "$name" mkdir -p "$repo" /home/agent/harness
tar -c -C "$wb/base" . | docker exec -i "$name" tar -x -C "$repo"
tar -c -C "$wb/harness" checker tasks | docker exec -i "$name" tar -x -C /home/agent/harness
docker exec -w "$repo" "$name" sh -c 'pnpm install --frozen-lockfile > /tmp/install.log 2>&1 || { tail -20 /tmp/install.log; exit 1; }'
case $condition in
  by-hand)
    docker exec -w "$repo" "$name" rm -rf .claude/skills/pbuilder
    docker exec -u root "$name" sh -c 'f=$(command -v builder) && mv "$f" "$f.disabled"'
    ;;
  catalog) tar -c -C "$wb/harness/exp3/catalog" . | docker exec -i "$name" tar -x -C "$repo" ;;
esac
echo "$condition" > "$logs/condition"
docker exec -w "$repo" "$name" git init -q
docker exec -w "$repo" "$name" git add -A
docker exec -w "$repo" "$name" git "${git_as[@]}" commit -qm "Initial admin with the Authors module"

for row in $(python3 -I -c 'import json,sys; print(" ".join(t["id"] + ":" + t["prompt"] for t in json.load(open(sys.argv[1]))))' "$wb/harness/tasks/sequence.json"); do
  task=${row%%:*} prompt=${row#*:}
  dir=$logs/$task
  mkdir -p "$dir"
  echo "$(date -u +%H:%M:%S) $seq_id $task start"
  # Diffs are taken against this commit, so a session that commits anyway is still captured.
  prev=$(docker exec -w "$repo" "$name" git rev-parse HEAD)

  start=$(date +%s)
  ANTHROPIC_API_KEY="$(security find-generic-password -s anthropic-api-key -w)" \
    docker exec -i -w "$repo" -e ANTHROPIC_API_KEY "$name" \
      claude -p --bare --verbose \
        --model "$model" \
        --max-budget-usd "$budget" \
        --output-format stream-json \
        --dangerously-skip-permissions \
        --append-system-prompt "$(cat "$context")" \
    < "$wb/harness/tasks/$prompt" > "$dir/stream.jsonl" 2> "$dir/stderr.log" \
    || echo "agent exited $?" >> "$dir/stderr.log"
  echo $(( $(date +%s) - start )) > "$dir/wall_seconds"
  tail -n 1 "$dir/stream.jsonl" > "$dir/result.json"

  docker exec -w "$repo" "$name" git add -A
  docker exec -w "$repo" "$name" git diff --cached --stat "$prev" > "$dir/diffstat.txt"
  docker exec -w "$repo" "$name" git diff --cached "$prev" > "$dir/diff.patch"
  docker exec -w "$repo" "$name" git reset -q

  docker exec "$name" bash /home/agent/harness/checker/check-task.sh "$repo" /home/agent/harness/checker "$task" "/home/agent/out/$task" \
    | tee "$dir/check-summary.json"
  docker exec "$name" tar -c -C "/home/agent/out/$task" . | tar -x -C "$dir"

  # The schematics as they stand after this session, for analyze.py.
  docker exec -w "$repo" "$name" sh -c 'tar -c project-builder.json $(test -d schematics && echo schematics)' > "$dir/schematics.tar"

  docker exec -w "$repo" "$name" git add -A
  docker exec -w "$repo" "$name" git "${git_as[@]}" commit -qm "$(head -n 1 "$wb/harness/tasks/$prompt" | tr -d '*')" --allow-empty
done
echo "$(date -u +%H:%M:%S) $seq_id done"
