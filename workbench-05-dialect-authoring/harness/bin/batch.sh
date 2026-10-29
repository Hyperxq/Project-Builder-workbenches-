#!/usr/bin/env bash
# Runs every repetition in both arms, one run at a time, alternating which arm goes
# first, and keeps going when one run fails. Never run two of these at once: parallel
# containers compete for CPU, tests slow down and agents spend paid turns on timeouts.
set -uo pipefail

reps=${REPS:-3}
runs=${RUNS_DIR:-$HOME/pb-experiment/wb05/runs}
bin=$(cd "$(dirname "$0")" && pwd)
mkdir -p "$runs"
for rep in $(seq 1 "$reps"); do
  if (( rep % 2 )); then arms="a b"; else arms="b a"; fi
  for arm in $arms; do
    id=wb05-$arm-$rep
    [[ -e $runs/$id/checks.json ]] && { echo "$id skipped (done)"; continue; }
    echo "$(date -u +%H:%M:%S) $id start"
    ARM=$arm "$bin/run.sh" "$id" > "$runs/../batch-$id.log" 2>&1 || echo "$id runner exited $?"
    echo "$(date -u +%H:%M:%S) $id $(cat "$runs/$id/check-summary.json" 2>/dev/null)"
  done
done
echo "batch done"
