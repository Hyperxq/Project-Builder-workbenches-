#!/usr/bin/env bash
# Runs N sequences of experiment 2, one at a time, and keeps going when one fails.
# Never run two at once: parallel containers compete for CPU, tests slow down and
# agents spend paid turns on timeouts.
set -uo pipefail

n=${N:-10}
runs=${RUNS_DIR:-$HOME/pb-experiment/wb06/exp2}
bin=$(cd "$(dirname "$0")" && pwd)
mkdir -p "$runs"
for i in $(seq 1 "$n"); do
  id=wb06-exp2-seq$i
  [[ -e $runs/$id/T10/checks.json ]] && { echo "$id skipped (done)"; continue; }
  [[ -e $runs/$id ]] && { echo "$id incomplete: move it aside to rerun"; continue; }
  "$bin/../bin/run-sequence.sh" exp2 "$id" > "$runs/../batch-$id.log" 2>&1 || echo "$id runner exited $?"
  echo "$(date -u +%H:%M:%S) $id $(tail -n 1 "$runs/../batch-$id.log")"
done
echo "batch done"
