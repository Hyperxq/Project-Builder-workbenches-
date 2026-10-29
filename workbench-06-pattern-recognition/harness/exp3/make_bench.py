"""Experiment 3: one dashboard scorecard per finished session, plus the catalog arm's selection.

Usage: python3 -I make_bench.py [runs-dir]
Each task session of each finished sequence becomes one results/<date>_<arm>/ scorecard:
the catalog arm (b) is recorded as `with-schematics` and by hand (a) as
`without-schematics`. The catalog arm's choices are summarised in results-selection.json.
"""

import json
import os
import re
import sys
from datetime import datetime, timedelta, timezone
from pathlib import Path

WB = Path(__file__).resolve().parents[2]
RUNS = Path(sys.argv[1]) if len(sys.argv) > 1 else Path.home() / "pb-experiment/wb06/exp3"
ARM = {"by-hand": "without-schematics", "catalog": "with-schematics"}
SEQUENCE = json.loads((WB / "harness/tasks/sequence.json").read_text())
EXPECTED = {"P1": "author-field", "P2": "static-page", "one-off": None}
EXECUTE = re.compile(r"builder\s+(?:--\S+\s+)*execute\s+(?:--\S+\s+)*(?:[\w-]+:)?([\w-]+)")
INFO = re.compile(r"builder\s+(?:--\S+\s+)*info\b")
CONTEXT = {
    "host_os": f"macOS (Darwin {os.uname().release}) · Apple Silicon",
    "harness": "one headless agent per task: claude -p --bare --dangerously-skip-permissions, one container per sequence, sequences sequential",
    "container": "claude-runner image · pbuilder CLI 0.9.11 · @pbuilder/sdk 0.12.0",
}


def tool_calls(stream):
    for line in stream.read_text().splitlines():
        try:
            event = json.loads(line)
        except json.JSONDecodeError:
            continue
        for block in (event.get("message") or {}).get("content") or []:
            if isinstance(block, dict) and block.get("type") == "tool_use":
                yield block.get("name"), block.get("input") or {}


def selection(task, stream):
    executed, exploration = [], 0
    for name, args in tool_calls(stream):
        command = args.get("command", "") if name == "Bash" else ""
        executed += EXECUTE.findall(command)
        exploration += len(INFO.findall(command)) + (name == "Read" and "/schematics/" in args.get("file_path", ""))
    expected = EXPECTED[task["pattern"]]
    return {
        "right_use": expected in executed,
        "wrong_use": sorted({n for n in executed if n != expected}),
        "miss": expected is not None and expected not in executed,
        "exploration_calls": exploration,
    }


count, picks = 0, []
for seq in sorted(RUNS.glob("wb06-exp3-*-seq*")):
    if not (seq / SEQUENCE[-1]["id"] / "checks.json").exists():
        continue
    condition = (seq / "condition").read_text().strip()
    sweep = "wb06-exp3-" + seq.name.rsplit("-", 1)[1]
    for task in SEQUENCE:
        tdir = seq / task["id"]
        result = json.loads((tdir / "result.json").read_text() or "{}")
        checks = json.loads((tdir / "checks.json").read_text())
        started = datetime.fromtimestamp(os.stat(tdir).st_birthtime, timezone.utc)
        patch = (tdir / "diff.patch").read_text()
        files = re.split(r"^diff --git ", patch, flags=re.M)[1:]
        added = sum(1 for f in files for l in f.splitlines() if l.startswith("+") and not l.startswith("+++"))
        removed = sum(1 for f in files for l in f.splitlines() if l.startswith("-") and not l.startswith("---"))
        bench = {
            "date": started.isoformat().replace("+00:00", "Z"),
            "arm": ARM[condition],
            "task": f"{task['id']} ({task['pattern']})",
            "run": {
                "sweep_id": sweep,
                "protocol_version": f"harness/bin/run-sequence.sh {condition} · task harness/tasks/{task['prompt']}",
                "attempt": 1,
                "context": CONTEXT,
            },
            "agent": {
                "model": next(iter(result.get("modelUsage") or {}), "claude-opus-5-5"),
                "exit_code": 0 if result.get("subtype") == "success" else 1,
                "wall_seconds": int((tdir / "wall_seconds").read_text()),
                "api_seconds": round(result.get("duration_api_ms", 0) / 1000),
                "num_turns": result.get("num_turns"),
                "tokens": {k: v for k, v in (result.get("usage") or {}).items() if k != "iterations"},
                "cost_usd": result.get("total_cost_usd"),
                "session_id": result.get("session_id"),
            },
            "definition_of_done": {
                "first_attempt_pass": checks["correct"],
                "gates": [
                    *({"gate": g, "pass": v == "pass", "seconds": None} for g, v in checks["gates"].items()),
                    {"gate": "hidden tests", "pass": checks["hidden"].get(task["id"]) == "pass", "seconds": None},
                    {"gate": "no regressions", "pass": not checks["regressions"], "seconds": None},
                ],
            },
            "output": {"files_created": sum(1 for f in files if "\nnew file mode" in f.split("@@", 1)[0]), "loc_delta": added - removed},
        }
        # The dashboard names a run by its minute; a session shorter than a minute takes the next free one.
        stamp = started
        while (target := WB / "results" / f"{stamp.strftime('%Y-%m-%d_%H-%M')}_{ARM[condition]}").exists():
            stamp += timedelta(minutes=1)
        target.mkdir(parents=True)
        (target / "bench.json").write_text(json.dumps(bench, indent=2) + "\n")
        (target / "agent-report.md").write_text(str(result.get("result", "")).rstrip() + "\n")
        count += 1
        if condition == "catalog":
            picks.append({"sequence": seq.name, "task": task["id"], "pattern": task["pattern"], **selection(task, tdir / "stream.jsonl")})

pattern_tasks = [p for p in picks if p["pattern"] != "one-off"]
summary = {
    "sessions": len(picks),
    "right_use_rate": sum(p["right_use"] for p in pattern_tasks) / len(pattern_tasks) if pattern_tasks else None,
    "miss_rate": sum(p["miss"] for p in pattern_tasks) / len(pattern_tasks) if pattern_tasks else None,
    "wrong_uses": sum(len(p["wrong_use"]) for p in picks),
    "exploration_calls": sum(p["exploration_calls"] for p in picks),
    "sessions_detail": picks,
}
(WB / "results-selection.json").write_text(json.dumps(summary, indent=2) + "\n")
print(count, "scorecards;", {k: v for k, v in summary.items() if k != "sessions_detail"})
