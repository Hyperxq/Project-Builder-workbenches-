"""Summarises phase 3 runs: cost, tokens, time, checks, overlap with the schematic
output, and structural deviations from the phase 1 conventions.

Usage: python3 -I analyze.py [run-id-prefix]
"""

import json
import os
import re
import statistics
import sys
from collections import Counter
from pathlib import Path

HOME = Path.home()
RUNS = HOME / "pb-experiment/runs"
REPOS = HOME / "pb-runs"
GENERATED = HOME / "pb-experiment/protocol/analysis" / os.environ.get("GENERATED", "generated")
EXCLUDED = {"package-lock.json"}
WEB_PORT, SERVICE_PORT = "3104", "4104"


def added_lines(patch: str) -> dict[str, Counter]:
    files: dict[str, Counter] = {}
    current = None
    for line in patch.splitlines():
        if line.startswith("+++ "):
            path = line[6:] if line.startswith("+++ b/") else None
            current = None if path in EXCLUDED else path
            if current:
                files.setdefault(current, Counter())
        elif current and line.startswith("+") and not line.startswith("+++"):
            text = line[1:].strip()
            if text:
                files[current][text] += 1
    return files


def overlap(run: dict[str, Counter], generated: dict[str, Counter]) -> tuple[int, int]:
    total = sum(sum(c.values()) for c in run.values())
    kept = sum(sum((c & generated.get(path, Counter())).values()) for path, c in run.items())
    return kept, total


def read(repo: Path, path: str) -> str:
    target = repo / path
    return target.read_text() if target.is_file() else ""


def deviations(repo: Path, name: str) -> list[str]:
    found = []

    def check(ok: bool, label: str):
        if not ok:
            found.append(label)

    web, service, contract = f"apps/{name}", f"apps/{name}-service", f"packages/{name}-contract"
    for path in (web, service, contract):
        check((repo / path).is_dir(), f"missing {path}")
    project = json.loads(read(repo, f"{web}/project.json") or "{}")
    check(project.get("name") == name, "provider project name")
    check(set(project.get("tags", [])) == {"type:app", "scope:web"}, "provider tags")
    service_pkg = json.loads(read(repo, f"{service}/package.json") or "{}")
    check(service_pkg.get("nx", {}).get("name") == f"{name}-service", "service nx.name")
    check(set(service_pkg.get("nx", {}).get("tags", [])) == {"type:app", "scope:api"}, "service tags")
    contract_pkg = json.loads(read(repo, f"{contract}/package.json") or "{}")
    check(contract_pkg.get("nx", {}).get("name") == f"{name}-contract", "contract nx.name")
    check(set(contract_pkg.get("nx", {}).get("tags", [])) == {"type:shared", "scope:shared"}, "contract tags")
    check(contract_pkg.get("type") != "module", "contract type: module")
    check(f"PORT = {WEB_PORT}" in read(repo, f"{web}/rsbuild.config.ts"), f"provider port {WEB_PORT}")
    mf = read(repo, "apps/shell/src/mf.ts")
    check(f"alias: '{name}'" in mf and f"localhost:{WEB_PORT}/remoteEntry.js" in mf, "shell PROVIDERS entry")
    check(f'<ProviderBoundary name="{name}">' in read(repo, "apps/shell/src/App.tsx"), "shell ProviderBoundary")
    contract_src = "\n".join(p.read_text() for p in (repo / contract / "src").glob("*.ts")) if (repo / contract / "src").is_dir() else ""
    check(f"_SERVICE_DEFAULT_PORT = {SERVICE_PORT}" in contract_src, f"service port {SERVICE_PORT}")
    check("createMicroservice" in read(repo, f"{service}/src/main.ts"), "service is TCP only")
    module = read(repo, "apps/gateway/src/app/app.module.ts")
    const = name.replace("-", "_").upper()
    check(f"name: {const}_SERVICE" in module, "gateway client registration")
    root = json.loads(read(repo, "package.json") or "{}")
    check(service in root.get("workspaces", []) or "apps/*" in root.get("workspaces", []), "root workspaces")
    refs = [r["path"] for r in json.loads(read(repo, "tsconfig.json") or "{}").get("references", [])]
    check(f"./{contract}" in refs and f"./{service}" in refs, "root tsconfig references")
    check(not (repo / f"{service}-e2e").exists(), "leftover e2e project")
    check('"axios"' not in json.dumps(root.get("dependencies", {})), "axios added")
    service_src = "\n".join(p.read_text() for p in (repo / service / "src").rglob("*.ts") if not p.name.endswith(".spec.ts")) if (repo / service / "src").is_dir() else ""
    check("BadRequestException" not in service_src, "HTTP exception inside the service")
    check(f"`apps/{name}`" in read(repo, "README.md"), "README layout row")
    return found


def main():
    prefix = sys.argv[1] if len(sys.argv) > 1 else "p3-"
    generated = {p.stem: added_lines(p.read_text()) for p in GENERATED.glob("*.patch")}
    rows = []
    for run in sorted(RUNS.glob(f"{prefix}*")):
        result_path = run / "result.json"
        if not (run / "checks.txt").exists() or not result_path.exists():
            continue
        _, name, arm, rep = run.name.split("-")
        result = json.loads(result_path.read_text() or "{}")
        usage = result.get("usage", {})
        tokens = sum(usage.get(k, 0) for k in ("input_tokens", "cache_creation_input_tokens", "cache_read_input_tokens", "output_tokens"))
        checks = (run / "checks.txt").read_text().split("\n")
        kept, total = overlap(added_lines((run / "diff.patch").read_text()), generated.get(name, {}))
        rows.append({
            "run": run.name, "feature": name, "arm": arm,
            "cost": result.get("total_cost_usd", 0), "tokens": tokens, "out": usage.get("output_tokens", 0),
            "seconds": result.get("duration_ms", 0) / 1000, "turns": result.get("num_turns", 0),
            "checks_failed": [c.split()[0] for c in checks if c.endswith("FAIL")],
            "overlap": kept / total if total else 0, "lines": total,
            "deviations": deviations(REPOS / run.name, name),
        })
    for r in rows:
        print(f"{r['run']:<24} ${r['cost']:.2f} {r['tokens']:>8} tok {r['out']:>6} out {r['seconds']:>6.0f}s {r['turns']:>3} turns "
              f"lines {r['lines']:>5} overlap {r['overlap']:.0%} fails {','.join(r['checks_failed']) or '-'} dev {len(r['deviations'])} {r['deviations']}")
    for arm in ("a", "b"):
        sel = [r for r in rows if r["arm"] == arm]
        if sel:
            med = lambda k: statistics.median(r[k] for r in sel)
            print(f"arm {arm}: n={len(sel)} median cost ${med('cost'):.2f} tokens {med('tokens'):.0f} seconds {med('seconds'):.0f} "
                  f"turns {med('turns'):.0f} overlap {med('overlap'):.0%} deviations {sum(len(r['deviations']) for r in sel)} "
                  f"check failures {sum(len(r['checks_failed']) for r in sel)}")
    (HOME / f"pb-experiment/protocol/analysis/{prefix.rstrip(chr(45))}.json").write_text(json.dumps(rows, indent=2))


if __name__ == "__main__":
    main()
