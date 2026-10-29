#!/usr/bin/env bash
# Runs SEQS sequences per arm of experiment 3, one at a time, alternating which arm goes
# first, and keeps going when one fails. Never run two at once: parallel containers
# compete for CPU, tests slow down and agents spend paid turns on timeouts.
set -uo pipefail

seqs=${SEQS:-3}
runs=${RUNS_DIR:-$HOME/pb-experiment/wb06/exp3}
bin=$(cd "$(dirname "$0")/../bin" && pwd)
mkdir -p "$runs"
for i in $(seq 1 "$seqs"); do
  if (( i % 2 )); then arms="a b"; else arms="b a"; fi
  for arm in $arms; do
    if [[ $arm == a ]]; then condition=by-hand; else condition=catalog; fi
    id=wb06-exp3-$arm-seq$i
    [[ -e $runs/$id/T10/checks.json ]] && { echo "$id skipped (done)"; continue; }
    [[ -e $runs/$id ]] && { echo "$id incomplete: move it aside to rerun"; continue; }
    "$bin/run-sequence.sh" "$condition" "$id" > "$runs/../batch-$id.log" 2>&1 || echo "$id runner exited $?"
    echo "$(date -u +%H:%M:%S) $id $(tail -n 1 "$runs/../batch-$id.log")"
  done
done
echo "batch done"
