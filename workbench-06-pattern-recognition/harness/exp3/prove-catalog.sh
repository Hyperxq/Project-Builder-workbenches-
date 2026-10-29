#!/usr/bin/env bash
# Proves the catalog without an agent: on the base with the catalog installed, every P1
# and P2 task done with one `builder execute` of the right schematic, and every one-off
# with the reference solution, must pass check-task.sh. Then the three distractors run
# on the final state and the gates must still pass. No API key, no paid call.
set -euo pipefail

wb=$(cd "$(dirname "$0")/../.." && pwd)
image=${IMAGE:-claude-runner-runner-web:latest}
name=pb-wb06-prove-catalog
repo=/home/agent/repo

docker run -d --name "$name" --entrypoint sleep "$image" infinity > /dev/null
trap 'docker rm -f "$name" > /dev/null' EXIT
docker exec "$name" mkdir -p "$repo" /home/agent/harness
tar -c -C "$wb/base" . | docker exec -i "$name" tar -x -C "$repo"
tar -c -C "$wb/harness/exp3/catalog" . | docker exec -i "$name" tar -x -C "$repo"
tar -c -C "$wb/harness" checker tasks reference | docker exec -i "$name" tar -x -C /home/agent/harness
docker exec -w "$repo" "$name" sh -c 'pnpm install --frozen-lockfile > /tmp/install.log 2>&1 || { tail -20 /tmp/install.log; exit 1; }'
docker exec -w "$repo" "$name" sh -c 'bun test schematics > /tmp/catalog-tests.log 2>&1 && echo "catalog tests: pass" || { tail -20 /tmp/catalog-tests.log; exit 1; }'

year="'Must be a year from 1000 to 2100'"
execute() { docker exec -w "$repo" "$name" builder execute "$@" > /dev/null; }
check() { docker exec "$name" bash /home/agent/harness/checker/check-task.sh "$repo" /home/agent/harness/checker "$1" "/home/agent/out/$1"; }
solve() { docker exec "$name" python3 -I /home/agent/harness/reference/solve.py "$repo" "$1"; }

execute default:author-field --key=website --title=Website "--schema=z.url('Must be a valid URL')";            echo "T01 $(check T01)"
execute default:static-page --slug=help --title=Help --icon=CircleHelp "--body=Questions about the admin? Write to support@example.com."; echo "T02 $(check T02)"
solve T03;                                                                                                        echo "T03 $(check T03)"
execute default:author-field --key=birthYear "--title=Birth year" "--schema=z.number().int($year).min(1000, $year).max(2100, $year)" --number=true; echo "T04 $(check T04)"
execute default:static-page --slug=about --title=About --icon=Info "--body=This admin manages the authors of the catalogue."; echo "T05 $(check T05)"
execute default:author-field --key=bio --title=Bio "--schema=z.string().trim().max(500, 'Must be at most 500 characters')"; echo "T06 $(check T06)"
solve T07;                                                                                                        echo "T07 $(check T07)"
execute default:static-page --slug=changelog --title=Changelog --icon=History "--body=Version 1.4.0 adds author profiles."; echo "T08 $(check T08)"
execute default:author-field --key=penName "--title=Pen name" "--schema=z.string().trim().min(1)";                echo "T09 $(check T09)"
solve T10;                                                                                                        echo "T10 $(check T10)"

execute default:author-column --key=website --title=Website
execute default:redirect-route --slug=writers --to=/authors
execute default:overview-card --plural=help --title=Help --icon=CircleHelp "--description=Questions and support."
docker exec -w "$repo" "$name" sh -c 'pnpm typecheck > /dev/null 2>&1 && pnpm lint > /dev/null 2>&1 && pnpm test:run > /dev/null 2>&1' \
  && echo "distractors: gates pass" || echo "distractors: gates fail"
