#!/usr/bin/env bash
# Runs every phase 3 task in both arms, alternating which arm goes first, and keeps
# going when one run fails so one infrastructure error does not cost the batch.
set -uo pipefail

protocol=$HOME/pb-experiment/protocol
base=$HOME/pb-experiment/storefront
i=0
for rep in 1 2 3; do
  for feature in reviews wishlist promotions; do
    if (( i % 2 == 0 )); then arms="a b"; else arms="b a"; fi
    i=$((i + 1))
    for arm in $arms; do
      id=p3-$feature-$arm-$rep
      [[ -e $HOME/pb-experiment/runs/$id/checks.txt ]] && { echo "$id skipped (done)"; continue; }
      echo "$(date -u +%H:%M:%S) $id start"
      ARM=$arm "$protocol/bin/run.sh" "$id" "$base" "$protocol/tasks/phase3-$feature.md" \
        > "$protocol/batch-$id.log" 2>&1 || echo "$id runner exited $?"
      echo "$(date -u +%H:%M:%S) $id $(tr '\n' ' ' < "$HOME/pb-experiment/runs/$id/checks.txt" 2>/dev/null) $(jq -c '{c:.total_cost_usd,t:.num_turns,ms:.duration_ms}' "$HOME/pb-experiment/runs/$id/result.json" 2>/dev/null)"
    done
  done
done
echo "batch done"
