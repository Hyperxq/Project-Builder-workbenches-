#!/bin/bash
# Arms are DERIVED artifacts: base/ is the single source of truth and the only
# place shared infrastructure may be edited. Deltas overlay AFTER the copy so
# `diff -r without-schematics with-schematics` shows exactly the experimental
# variable and nothing else. Re-run after ANY base change — a mid-sweep base
# edit invalidates the sweep (both arms must restart from the same frozen base).
set -euo pipefail
cd "$(dirname "$0")"

for arm in without-schematics with-schematics; do
  rm -rf "$arm"
  rsync -a --exclude node_modules --exclude .DS_Store base/ "$arm/"
done

rsync -a deltas/with-schematics/ with-schematics/

echo "Arms derived. Experimental delta:"
# diff exits 1 when the arms differ — that IS the expected state.
diff -rq without-schematics with-schematics | sed 's/^/  /' || true
