"""Serves one finished run's feature stack in a fresh container and probes it.

Usage: python3 -I e2e_run.py <run-id> [--keep]
Prints one JSON line. With --keep the container stays up as pb-e2e with the
shell (4200), the gateway (3000) and the provider (3104) published.
"""

import json
import re
import subprocess
import sys
import time
from pathlib import Path

IMAGE = "pb-runner:2.1.308"
NAME = "pb-e2e"
DIR = "/home/node/work/repo"


def sh(*args, check=True, input_bytes=None):
    return subprocess.run(args, check=check, capture_output=True, input=input_bytes)


def in_container(script: str, check=False) -> subprocess.CompletedProcess:
    return sh("docker", "exec", NAME, "sh", "-c", script, check=check)


def routes(controller: str) -> tuple[str, list[tuple[str, str]]]:
    base = re.search(r"@Controller\(\s*'([^']*)'", controller)
    found = re.findall(r"@(Get|Post|Put|Patch|Delete)\(\s*(?:'([^']*)')?\s*\)", controller)
    return (base.group(1) if base else ""), [(verb.upper(), sub or "") for verb, sub in found]


def fill(path: str) -> str:
    return re.sub(r":(\w+)", lambda m: "11111111-1111-4111-8111-111111111111" if "id" in m.group(1).lower() else "probe", path)


def status(method: str, url: str, body: str | None = None) -> int:
    data = f"-H 'content-type: application/json' -d '{body}'" if body is not None else ""
    out = in_container(f"curl -s -o /dev/null -w '%{{http_code}}' -X {method} {data} '{url}'")
    return int(out.stdout or 0)


def main():
    run_id = sys.argv[1]
    keep = "--keep" in sys.argv
    feature = run_id.split("-")[1]
    repo = Path.home() / "pb-runs" / run_id
    controller = (repo / f"apps/gateway/src/app/{feature}.controller.ts").read_text()
    result = {"run": run_id}

    sh("docker", "rm", "-f", NAME, check=False)
    sh("docker", "run", "-d", "--name", NAME, "-p", "4200:4200", "-p", "3000:3000", "-p", "3104:3104", IMAGE, "sleep", "infinity")
    tar = sh("tar", "-c", "--exclude=node_modules", "--exclude=.git", "--exclude=.nx", "-C", str(repo), ".").stdout
    sh("docker", "exec", "-i", NAME, "tar", "-x", "-C", DIR, input_bytes=tar)
    result["npm_ci"] = in_container("npm ci --no-audit --no-fund > /tmp/npm.log 2>&1").returncode == 0
    if not result["npm_ci"]:
        in_container("npm install --no-audit --no-fund > /tmp/npm.log 2>&1")

    projects = f"{feature}-service,gateway,{feature},shell"
    sh("docker", "exec", "-d", "-e", "HOST=0.0.0.0", NAME, "sh", "-c",
       f"npx nx run-many -t serve --parallel=10 -p {projects} > /tmp/serve.log 2>&1")
    deadline = time.time() + 240
    while time.time() < deadline:
        ready = [status("GET", f"http://localhost:{p}/") for p in (3000, 3104, 4200)]
        if all(code > 0 for code in ready):
            break
        time.sleep(3)
    time.sleep(3)
    log = in_container("cat /tmp/serve.log").stdout.decode(errors="replace")
    result["service_listening"] = bool(re.search(r"listening on tcp://\S+:4104", log, re.I))
    result["remote_entry"] = status("GET", "http://localhost:3104/remoteEntry.js")
    result["shell"] = status("GET", "http://localhost:4200/")

    base, found = routes(controller)
    probes = []
    for method, sub in found:
        path = "/".join(p for p in (base, sub) if p)
        url = f"http://localhost:3000/api/{fill(path)}"
        if method == "GET":
            probes.append((method, path, status("GET", url)))
        else:
            probes.append((method, path, status(method, url, "{}")))
    result["routes"] = probes
    gets = [code for method, _, code in probes if method == "GET"]
    writes = [code for method, _, code in probes if method in ("POST", "PUT", "PATCH")]
    result["gets_ok"] = bool(gets) and all(code in (200, 404) for code in gets)
    result["empty_write_400"] = bool(writes) and all(code == 400 for code in writes)
    result["no_5xx"] = all(code < 500 for _, _, code in probes)
    print(json.dumps(result))
    if not keep:
        sh("docker", "rm", "-f", NAME, check=False)


if __name__ == "__main__":
    main()
