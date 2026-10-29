#!/usr/bin/env bash
# Usage: check.sh <repo> <checker-dir> <out-dir>
# Runs inside a run's container once the agent is done. Scores the schematics the
# agent authored by applying them to clean copies of the base commit, never to the
# agent's own working tree. Writes <out-dir>/checks.json.
set -uo pipefail

repo=$1 checker=$2 out=$3
entities=$checker/entities.json
names=(sidebar-entry overview-card handlers-registration route-keys)
files=(src/app/shell/app-sidebar.tsx src/routes/index.tsx mocks/handlers.ts mocks/setup-test-mocking.ts mocks/core/types.ts)
work=$(mktemp -d)
mkdir -p "$out"
declare -A result

record() { result[$1]=$2; echo "$1 $2" >> "$out/checks.txt"; }

# A copy of the base commit carrying only the agent's schematics and manifest.
fresh() {
  local dir=$1 variant=${2:-}
  rm -rf "$dir" && mkdir -p "$dir"
  git -C "$repo" archive base | tar -x -C "$dir"
  rm -rf "$dir/schematics" && cp -R "$repo/schematics" "$repo/project-builder.json" "$dir/"
  [[ -n $variant ]] && cp -R "$variant/." "$dir/"
  (cd "$dir" && pnpm install --frozen-lockfile --offline > /dev/null 2>&1)
  git -C "$dir" init -q && git -C "$dir" add -A && git -C "$dir" -c user.name=check -c user.email=check@local commit -qm before
}

# One `builder execute` per schematic and entity, with the inputs each schema declares.
commands() {
  python3 -I - "$1" "$entities" "$2" <<'EOF'
import json, shlex, sys
from pathlib import Path
dir, entities, only = Path(sys.argv[1]), json.loads(Path(sys.argv[2]).read_text()), sys.argv[3]
for e in entities if only == "all" else [x for x in entities if x["plural"] == only]:
    for name in ("sidebar-entry", "overview-card", "handlers-registration", "route-keys"):
        schema = dir / "schematics" / name / "schema.json"
        keys = json.loads(schema.read_text()).get("properties", {}) if schema.exists() else {}
        print(shlex.join(["builder", "execute", f"default:{name}", *[f"--{k}={e[k]}" for k in keys if k in e]]))
EOF
}

apply() {
  local dir=$1 only=${2:-all} failed=0
  while IFS= read -r command; do
    (cd "$dir" && eval "$command") >> "$out/apply.log" 2>&1 || { echo "FAILED: $command" >> "$out/apply.log"; failed=1; }
  done < <(commands "$dir" "$only")
  return $failed
}

# 1. The agent's own deliverable.
(cd "$repo" && bun test schematics) > "$out/agent-tests.log" 2>&1 && record agent_tests pass || record agent_tests fail
for name in "${names[@]}"; do
  (cd "$repo" && builder info "default:$name") > /dev/null 2>&1 && record "registered_$name" pass || record "registered_$name" fail
done

# 2. Apply every schematic for every entity to a clean copy.
fresh "$work/apply"
apply "$work/apply" && record apply pass || record apply fail
python3 -I "$checker/assertions.py" "$work/apply" "$entities" > "$out/semantic.json"
exact=pass
for file in "${files[@]}"; do cmp -s "$work/apply/$file" "$checker/expected/$file" || exact=fail; done
record exact_match "$exact"

# 3. A second run changes nothing.
git -C "$work/apply" add -A && git -C "$work/apply" -c user.name=check -c user.email=check@local commit -qm applied
apply "$work/apply" > /dev/null
[[ -z $(git -C "$work/apply" status --porcelain) ]] && record idempotent pass || record idempotent fail

# 4. The app still builds and its tests pass, with stub modules for the new entities.
python3 -I - "$work/apply" "$entities" <<'EOF'
import json, sys
from pathlib import Path
dir, entities = Path(sys.argv[1]), json.loads(Path(sys.argv[2]).read_text())
pascal = lambda k: "".join(p[:1].upper() + p[1:] for p in k.split("-"))
for e in entities:
    single, plural = pascal(e["singular"]), pascal(e["plural"])
    (dir / f"mocks/domains/{e['plural']}.mock.ts").write_text(
        "import type { HttpHandler } from 'msw'\n"
        "import type { MockConfig } from '../core/mock.config'\n\n"
        f"export function {single[:1].lower() + single[1:]}Handlers(_config: MockConfig, _base: string): HttpHandler[] {{\n  return []\n}}\n\n"
        f"export function reset{plural}(): void {{}}\n")
    route = dir / f"src/routes/{e['plural']}/index.tsx"
    route.parent.mkdir(parents=True, exist_ok=True)
    route.write_text(
        "import { createFileRoute } from '@tanstack/react-router'\n\n"
        f"export const Route = createFileRoute('/{e['plural']}/')({{\n  component: () => null,\n}})\n")
EOF
for gate in typecheck lint test:run; do
  (cd "$work/apply" && pnpm "$gate") > "$out/gate-${gate/:/-}.log" 2>&1 && record "gate_${gate/:/_}" pass || record "gate_${gate/:/_}" fail
done

# 5. The same edits on reformatted copies of the five files.
fresh "$work/variant" "$checker/variants"
apply "$work/variant" && record variant_apply pass || record variant_apply fail
python3 -I "$checker/assertions.py" "$work/variant" "$entities" > "$out/variant-semantic.json"

# 6. Each schematic refuses, writing nothing, when the code it edits around is gone.
declare -A anchor=(
  [sidebar-entry]="src/app/shell/app-sidebar.tsx|const NAV: NavEntry[] = [|const ITEMS: NavEntry[] = ["
  [overview-card]='src/routes/index.tsx|aria-label="Entities"|aria-label="Modules"'
  [handlers-registration]="mocks/handlers.ts|export function createHandlers(|export function buildHandlers("
  [route-keys]="mocks/core/types.ts|export type MockRouteKey =|export type RouteKey ="
)
for name in "${names[@]}"; do
  IFS='|' read -r file from to <<< "${anchor[$name]}"
  fresh "$work/missing-$name"
  python3 -I -c 'import sys; p=sys.argv[1]; s=open(p).read(); open(p,"w").write(s.replace(sys.argv[2], sys.argv[3], 1))' "$work/missing-$name/$file" "$from" "$to"
  git -C "$work/missing-$name" -c user.name=check -c user.email=check@local commit -qam anchor-removed
  status=0
  (cd "$work/missing-$name" && eval "$(commands "$work/missing-$name" books | grep "default:$name ")") >> "$out/missing.log" 2>&1 || status=$?
  [[ $status -ne 0 && -z $(git -C "$work/missing-$name" status --porcelain) ]] && record "refuses_$name" pass || record "refuses_$name" fail
done

python3 -I - "$out" <<'EOF'
import json, sys
from pathlib import Path
out = Path(sys.argv[1])
checks = dict(line.split() for line in (out / "checks.txt").read_text().splitlines() if line)
semantic = json.loads((out / "semantic.json").read_text())
variant = json.loads((out / "variant-semantic.json").read_text())
passed = lambda report, name: all(not failures for failures in report[name].values())
summary = {
    "checks": checks,
    "semantic": {name: passed(semantic, name) for name in semantic},
    "variant": {name: passed(variant, name) for name in variant},
    "failures": {"semantic": semantic, "variant": variant},
}
summary["correct"] = all(summary["semantic"].values()) and checks.get("idempotent") == "pass" and all(
    checks.get(f"gate_{g}") == "pass" for g in ("typecheck", "lint", "test_run"))
(out / "checks.json").write_text(json.dumps(summary, indent=2) + "\n")
print(json.dumps({"correct": summary["correct"], "semantic": summary["semantic"], "variant": summary["variant"]}))
EOF
rm -rf "$work"
