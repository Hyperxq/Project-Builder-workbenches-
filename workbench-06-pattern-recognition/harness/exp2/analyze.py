"""Experiment 2 analysis: did the agent automate the repeated patterns on its own?

Usage: python3 -I analyze.py [runs-dir] [out-dir]
Reads every finished sequence under runs-dir and writes, under out-dir
(default results-recognition/): sequences/<id>.json, one per sequence, and
summary.json across them. The definitions are the ones PROTOCOL.md fixes.
"""

import io
import json
import re
import statistics
import sys
import tarfile
from pathlib import Path

WB = Path(__file__).resolve().parents[2]
RUNS = Path(sys.argv[1]) if len(sys.argv) > 1 else Path.home() / "pb-experiment/wb06/exp2"
OUT = Path(sys.argv[2]) if len(sys.argv) > 2 else WB / "results-recognition"
SEQUENCE = json.loads((WB / "harness/tasks/sequence.json").read_text())
PATTERNS = {"P1": [t["id"] for t in SEQUENCE if t["pattern"] == "P1"], "P2": [t["id"] for t in SEQUENCE if t["pattern"] == "P2"]}
ONE_OFF = {t["id"] for t in SEQUENCE if t["pattern"] == "one-off"}
P1_FILES = ("domain/author.ts", "author-form.tsx", "authors.mock.ts", "author-detail-page.tsx")
EXECUTE = re.compile(r"builder\s+(?:--\S+\s+)*execute\s+(?:--\S+\s+)*(?:[\w-]+:)?([\w-]+)")


def schematics(tar_bytes):
    """name -> all text of the schematic (sources, templates and their paths), tests excluded."""
    found = {}
    with tarfile.open(fileobj=io.BytesIO(tar_bytes)) as tar:
        for member in tar.getmembers():
            parts = Path(member.name).parts
            if len(parts) < 3 or parts[0] != "schematics" or not member.isfile() or ".test." in parts[-1]:
                continue
            text = tar.extractfile(member).read().decode("utf-8", "replace")
            found[parts[1]] = found.get(parts[1], "") + "\n" + "/".join(parts[2:]) + "\n" + text
    return found


def classify(text):
    """Which pattern a schematic automates, from the files its factory and templates write."""
    if sum(f in text for f in P1_FILES) >= 2:
        return "P1"
    if "app-sidebar" in text and "routes" in text:
        return "P2"
    return "other"


def executed(stream):
    names = []
    for line in stream.read_text().splitlines():
        try:
            event = json.loads(line)
        except json.JSONDecodeError:
            continue
        for block in (event.get("message") or {}).get("content") or []:
            if isinstance(block, dict) and block.get("type") == "tool_use" and block.get("name") == "Bash":
                names += EXECUTE.findall(block.get("input", {}).get("command", ""))
    return names


def sequence(dir):
    tasks, before = [], {}
    for t in SEQUENCE:
        tdir = dir / t["id"]
        result = json.loads((tdir / "result.json").read_text() or "{}")
        checks = json.loads((tdir / "checks.json").read_text())
        now = schematics((tdir / "schematics.tar").read_bytes())
        tasks.append({
            "task": t["id"],
            "pattern": t["pattern"],
            "correct": checks["correct"],
            "regressions": checks["regressions"],
            "cost_usd": result.get("total_cost_usd"),
            "num_turns": result.get("num_turns"),
            "wall_seconds": int((tdir / "wall_seconds").read_text()),
            "tokens_all": sum(v for k, v in (result.get("usage") or {}).items() if k.endswith("tokens") and isinstance(v, int)),
            "created": {name: classify(text) for name, text in now.items() if name not in before},
            "executed": executed(tdir / "stream.jsonl"),
        })
        before = now
    kinds = {name: kind for t in tasks for name, kind in t["created"].items()}
    patterns = {}
    for pattern, ids in PATTERNS.items():
        mine = {name for name, kind in kinds.items() if kind == pattern}
        created_in = next((t["task"] for t in tasks if any(kinds[n] == pattern for n in t["created"])), None)
        patterns[pattern] = {
            "automated": bool(mine),
            "schematics": sorted(mine),
            "created_in": created_in,
            "created_at_occurrence": ids.index(created_in) + 1 if created_in in ids else None,
            "later_occurrences_using_it": sum(
                1 for t in tasks if t["task"] in ids and created_in and t["task"] > created_in and mine & set(t["executed"])
            ),
            "later_occurrences": sum(1 for i in ids if created_in and i > created_in),
        }
    false_positives = sorted(
        name for t in tasks for name, kind in t["created"].items() if kind == "other" or t["task"] in ONE_OFF
    )
    return {"sequence": dir.name, "tasks": tasks, "patterns": patterns, "false_positives": false_positives}


def median(values):
    values = [v for v in values if v is not None]
    return statistics.median(values) if values else None


done = [d for d in sorted(RUNS.glob("wb06-exp2-seq*")) if (d / SEQUENCE[-1]["id"] / "checks.json").exists()]
results = [sequence(d) for d in done]
(OUT / "sequences").mkdir(parents=True, exist_ok=True)
for r in results:
    (OUT / "sequences" / f"{r['sequence']}.json").write_text(json.dumps(r, indent=2) + "\n")

summary = {"sequences": len(results), "patterns": {}, "false_positives_total": sum(len(r["false_positives"]) for r in results)}
for pattern, ids in PATTERNS.items():
    rows = [r["patterns"][pattern] for r in results]
    summary["patterns"][pattern] = {
        "occurrences": ids,
        "automation_rate": sum(r["automated"] for r in rows) / len(rows) if rows else None,
        "created_at_occurrence": [r["created_at_occurrence"] for r in rows if r["automated"]],
        "use_rate_after_creation": (
            sum(r["later_occurrences_using_it"] for r in rows) / sum(r["later_occurrences"] for r in rows)
            if sum(r["later_occurrences"] for r in rows) else None
        ),
        "median_cost_by_occurrence": [median(t["cost_usd"] for r in results for t in r["tasks"] if t["task"] == i) for i in ids],
        "median_wall_seconds_by_occurrence": [median(t["wall_seconds"] for r in results for t in r["tasks"] if t["task"] == i) for i in ids],
    }
summary["correct_rate"] = (
    sum(t["correct"] for r in results for t in r["tasks"]) / sum(len(r["tasks"]) for r in results) if results else None
)
(OUT / "summary.json").write_text(json.dumps(summary, indent=2) + "\n")
print(json.dumps(summary, indent=2))
