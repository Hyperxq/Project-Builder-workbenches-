#!/usr/bin/env bash
# Usage: check-task.sh <repo> <checker-dir> <task-id> <out-dir>
# Runs inside a sequence's container after one task's session. Scores the repository
# as the agent left it: the gates, then the hidden tests of this task and of every
# earlier task (regressions). Leaves the repository exactly as it found it, so the
# next session starts from the agent's own state. Writes <out-dir>/checks.json.
set -uo pipefail

repo=$1 checker=$2 task=$3 out=$4
hidden=src/__checker__
mkdir -p "$out"
cd "$repo"

gate() { pnpm "$1" > "$out/gate-$1.log" 2>&1 && echo pass || echo fail; }
typecheck=$(gate typecheck)
lint=$(gate lint)
test_run=$(gate test:run)

ids=$(python3 -I -c 'import json,sys; print(" ".join(t["id"] for t in json.load(open(sys.argv[1])) if t["id"] <= sys.argv[2]))' \
  "$checker/../tasks/sequence.json" "$task")
mkdir -p "$hidden"
for id in $ids; do cp "$checker/tests/$id.test.tsx" "$hidden/"; done
pnpm exec vitest run "$hidden" --reporter=json --outputFile="$out/hidden.json" > "$out/hidden.log" 2>&1

# T07 must follow package.json, not a copied number: rerun it on another version.
version_follows=skip
if [[ -e $hidden/T07.test.tsx ]]; then
  cp package.json "$out/package.json.orig"
  python3 -I -c 'import json; p=json.load(open("package.json")); p["version"]="9.9.9"; json.dump(p, open("package.json","w"), indent=2)'
  pnpm exec vitest run "$hidden/T07.test.tsx" > "$out/version-follows.log" 2>&1 && version_follows=pass || version_follows=fail
  cp "$out/package.json.orig" package.json && rm "$out/package.json.orig"
fi
rm -rf "$hidden"

python3 -I - "$out" "$task" "$typecheck" "$lint" "$test_run" "$version_follows" <<'EOF'
import json, sys
from pathlib import Path
out, task, typecheck, lint, test_run, version_follows = sys.argv[1:]
hidden = {}
report = Path(out, "hidden.json")
for f in json.loads(report.read_text())["testResults"] if report.exists() else []:
    tid = Path(f["name"]).name.split(".")[0]
    hidden[tid] = "pass" if f["assertionResults"] and all(a["status"] == "passed" for a in f["assertionResults"]) else "fail"
gates = {"typecheck": typecheck, "lint": lint, "test_run": test_run}
own = hidden.get(task, "fail")
if task == "T07" and version_follows != "pass":
    own = "fail"
checks = {
    "task": task,
    "gates": gates,
    "hidden": hidden,
    "version_follows": version_follows,
    "correct": own == "pass" and all(v == "pass" for v in gates.values()),
    "regressions": sorted(t for t, v in hidden.items() if t != task and v != "pass"),
}
Path(out, "checks.json").write_text(json.dumps(checks, indent=2) + "\n")
print(json.dumps({"task": task, "correct": checks["correct"], "regressions": checks["regressions"]}))
EOF
