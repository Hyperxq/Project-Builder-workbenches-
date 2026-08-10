# Claude Runner — isolated agent environment

Runs Claude Code against a workbench arm inside a container with a **fresh HOME**: no global `CLAUDE.md`, no hooks, no plugins, no MCP servers, no personal skills. The only context the agent sees is the mounted arm itself — including the arm's own `.claude/skills/` and `AGENTS.md`, which are part of the experiment.

This keeps the comparison honest: results measure the agent + the arm, not whatever harness happens to live on your machine.

## One-time setup

```bash
claude setup-token          # on your machine, requires a Claude subscription
cp .env.example .env        # paste the token into .env (gitignored)
```

## Run an arm

```bash
ARM=with-schematics docker compose run --rm runner
ARM=without-schematics docker compose run --rm runner
```

That drops you into an interactive Claude session at `/workspace` (the arm, bind-mounted read-write so results persist on the host for `git diff` afterwards). The entrypoint copies `.env.example` → `.env` if missing and runs `pnpm install --frozen-lockfile` before handing over.

Future workbenches: `WORKBENCH=workbench-02-... ARM=... docker compose run --rm runner`.

To get a shell instead of Claude:

```bash
ARM=with-schematics docker compose run --rm runner bash
```

`docker compose run` does not publish ports; to reach the GraphQL explorer from the host add `--service-ports` and start the app (`pnpm start:dev`) from a shell.

Tear down (also discards the MongoDB data — every run starts with an empty database):

```bash
docker compose down
```

## Measured runs — the standard evaluation protocol

Interactive sessions are for *watching*; measured runs are for *numbers*. Never mix them in the same dataset. A measured run gives one arm the canonical prompt — `Follow the instruction listed on entities-benchmark.txt`, verbatim, zero hints — so the agent performs the full sweep the benchmark file demands. Then it runs the definition of done and records everything under `../<workbench>/results/`. The script refuses to start if any benchmark entity already exists in the arm (a dirty arm measures nothing).

```bash
ARM=with-schematics    docker compose -p bench-with    run --rm runner bench.sh
ARM=without-schematics docker compose -p bench-without run --rm runner bench.sh
```

Each run produces `results/<stamp>_<arm>/`:

| File | Contents |
|---|---|
| `bench.json` | The scorecard — see schema below |
| `claude-stream.jsonl` | Full event stream — every tool call and message, in order; the last `result` event carries the telemetry |
| `gate-{tsc,lint,test,e2e}.log` | Full output of each definition-of-done gate |
| `claude-stderr.log` | Agent stderr, for debugging failed runs |

The run is live-narrated in the terminal (tool calls as `[Write] src/books/…`, agent commentary, then `[gate] …` progress) — you watch the whole thing while the stream is preserved for forensics.

`bench.json` schema:

```json
{
  "date": "…",
  "arm": "with-schematics",
  "task": "entities-benchmark full sweep",
  "agent": {
    "wall_seconds": 312,          // total wall-clock for the agent run
    "api_seconds": 280,           // time spent in API calls
    "num_turns": 24,
    "tokens": { "input_tokens": 0, "output_tokens": 0, "cache_read_input_tokens": 0, "cache_creation_input_tokens": 0 },
    "cost_usd": 0.42,             // API-equivalent cost (informational under subscription)
    "exit_code": 0
  },
  "definition_of_done": {
    "first_attempt_pass": true,   // all four gates green with zero human help
    "gates": [ { "gate": "tsc", "pass": true, "seconds": 11 }, "…lint/test/e2e" ]
  },
  "output": { "files_created": 9, "loc_delta": 640 }
}
```

Methodology for a fair comparison:

1. **Clean arm before every measured run** — from the repo root: `git checkout -- <workbench>/<arm> && git clean -fd <workbench>/<arm>`. The script enforces this and aborts on a dirty arm.
2. **Both arms back to back** — hardware and network conditions stay comparable.
3. **N ≥ 3 runs per arm** — AI is variant; a single run is an anecdote, not a measurement. Compare medians.
4. **Consistency check**: diff the generated code *between runs of the same arm*. Identical task, identical standard — how identical is the output?
5. Tokens are the primary cost metric; `cost_usd` is the API-equivalent price and is informational when running under a subscription.

## Cleaning between runs

Arms are bind-mounted, so agent sessions write straight into your working tree — and `git clean` treats uncommitted work and run leftovers exactly the same. The order below is not optional; each step exists because skipping it has already burned a run:

1. **Kill every agent session before cleaning.** A live (or zombie) container keeps writing into the arm through the bind mount and re-dirties it right after you clean:

   ```bash
   docker ps --filter name=bench        # anything alive? docker stop <id>
   ```

2. **Commit anything you want to keep first.** Untracked files — harness scripts, env fixes, results you care about — are indistinguishable from run garbage to `git clean -fd`.

3. **Clean the arm** (from the repo root; per arm, or the whole workbench):

   ```bash
   git checkout -- <workbench>/<arm> && git clean -fd <workbench>/<arm>
   ```

   Note: cleaning the whole workbench directory also deletes untracked `results/` runs — move any scorecard you want to keep out of the way (or commit it) first.

4. **Verify before launching**: `git status` must be empty for the arm. `bench.sh` double-checks this and aborts if any benchmark entity already exists — a run that starts on a dirty arm reports `files_created: 0` and green gates earned by old code: numbers that lie.

One session per arm, always — two agents writing into the same bind mount produce a tree nobody can attribute.

## Isolation model

| Concern | How it's handled |
|---|---|
| Global harness (`~/.claude`, CLAUDE.md, hooks, plugins) | Fresh container HOME — nothing to discover |
| MCP servers | `--strict-mcp-config` with no config = zero MCPs |
| Permission prompts | `--dangerously-skip-permissions` — the sandbox is the container |
| Host credentials (`gh`, git config, keychain) | Never mounted |
| Host `node_modules` (macOS binaries) | Masked by an anonymous volume; fresh Linux install per run |
| Auth | `CLAUDE_CODE_OAUTH_TOKEN` at runtime only — never in the image |
| Repo git history | `.git` lives at the repo root and is not mounted; the agent cannot touch it |

## Pinned toolchain

Versions are build args in the `Dockerfile` (claude-code, pnpm, bun, pbuilder). Bump them deliberately — a benchmark where the toolchain drifts between runs compares nothing. Rebuild after changing:

```bash
docker compose build
```

`pbuilder` installs from the GoReleaser Linux tarball (the same artifact the brew cask wraps), exposing the `builder` binary the `with-schematics` arm needs.
