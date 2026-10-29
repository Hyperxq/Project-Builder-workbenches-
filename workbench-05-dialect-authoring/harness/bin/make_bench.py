"""Writes one dashboard scorecard (bench.json + agent-report.md) per finished run.

Usage: python3 -I make_bench.py [runs-dir]
Arm b (dialects) is recorded as `with-schematics` and arm a (commons only) as
`without-schematics`, the two arm names the dashboard reads; the experiment's
cohort labels say which is which.
"""

import json
import os
import re
import subprocess
import sys
from datetime import datetime, timezone
from pathlib import Path

WB = Path(__file__).resolve().parents[2]
RUNS = Path(sys.argv[1]) if len(sys.argv) > 1 else Path.home() / "pb-experiment/wb05/runs"
ARM = {"a": "without-schematics", "b": "with-schematics"}
docker = subprocess.run(["docker", "info", "--format", "{{.ServerVersion}}"], capture_output=True, text=True).stdout.strip()
CONTEXT = {
    "host_os": f"macOS (Darwin {os.uname().release}) · Apple Silicon",
    "docker": f"Docker Engine {docker}",
    "harness": "single headless agent: claude -p --bare --dangerously-skip-permissions inside a fresh container per run, runs sequential",
    "container": "claude-runner image · Claude Code CLI 2.1.308 · bun · pbuilder CLI 0.9.11 · @pbuilder/sdk 0.12.0",
}
GATES = [
    ("schematic tests (agent)", lambda c: c["checks"].get("agent_tests") == "pass"),
    ("registered", lambda c: all(v == "pass" for k, v in c["checks"].items() if k.startswith("registered_"))),
    ("edits correct, two entities", lambda c: all(c["semantic"].values())),
    ("second run changes nothing", lambda c: c["checks"].get("idempotent") == "pass"),
    ("typecheck", lambda c: c["checks"].get("gate_typecheck") == "pass"),
    ("lint", lambda c: c["checks"].get("gate_lint") == "pass"),
    ("test", lambda c: c["checks"].get("gate_test_run") == "pass"),
    ("reformatted targets", lambda c: all(c["variant"].values())),
    ("refuses without its anchor", lambda c: all(v == "pass" for k, v in c["checks"].items() if k.startswith("refuses_"))),
    ("matches the reference byte for byte", lambda c: c["checks"].get("exact_match") == "pass"),
]

count = 0
for run in sorted(RUNS.glob("wb05-*-*")):
    if not (run / "checks.json").exists():
        continue
    _, arm, rep = run.name.split("-")
    result = json.loads((run / "result.json").read_text())
    checks = json.loads((run / "checks.json").read_text())
    started = datetime.fromtimestamp(os.stat(run).st_birthtime, timezone.utc)
    patch = (run / "diff.patch").read_text()
    files = [f for f in re.split(r"^diff --git ", patch, flags=re.M)[1:] if "pnpm-lock.yaml" not in f.split("\n", 1)[0]]
    added = sum(1 for f in files for l in f.splitlines() if l.startswith("+") and not l.startswith("+++"))
    removed = sum(1 for f in files for l in f.splitlines() if l.startswith("-") and not l.startswith("---"))
    bench = {
        "date": started.isoformat().replace("+00:00", "Z"),
        "arm": ARM[arm],
        "task": "author four registration schematics",
        "run": {
            "sweep_id": f"wb05-rep{rep}",
            "protocol_version": "harness/bin/run.sh per-run container · task harness/tasks/author-registration-schematics.md · "
            + ("dialects + dialects.md" if arm == "b" else "commons only"),
            "attempt": 1,
            "context": CONTEXT,
        },
        "agent": {
            "model": result.get("modelUsage") and next(iter(result["modelUsage"])) or "claude-opus-5-5",
            "exit_code": 0 if result.get("subtype") == "success" else 1,
            "wall_seconds": int((run / "wall_seconds").read_text()),
            "api_seconds": round(result.get("duration_api_ms", 0) / 1000),
            "num_turns": result.get("num_turns"),
            "tokens": {k: v for k, v in result.get("usage", {}).items() if k != "iterations"},
            "cost_usd": result.get("total_cost_usd"),
            "session_id": result.get("session_id"),
        },
        "definition_of_done": {
            "first_attempt_pass": checks["correct"],
            "gates": [{"gate": gate, "pass": test(checks), "seconds": None} for gate, test in GATES],
        },
        "output": {"files_created": sum(1 for f in files if "\nnew file mode" in f.split("@@", 1)[0]), "loc_delta": added - removed},
    }
    target = WB / "results" / f"{started.strftime('%Y-%m-%d_%H-%M')}_{ARM[arm]}"
    target.mkdir(parents=True, exist_ok=False)
    (target / "bench.json").write_text(json.dumps(bench, indent=2) + "\n")
    (target / "agent-report.md").write_text(str(result.get("result", "")).rstrip() + "\n")
    count += 1
print(count, "scorecards")
