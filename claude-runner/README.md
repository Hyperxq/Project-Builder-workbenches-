# Claude Runner — isolated agent environment

Runs Claude Code against a workbench arm inside a container with a **fresh HOME**: no global `CLAUDE.md`, no hooks, no plugins, no MCP servers, no personal skills. The only context the agent sees is the mounted arm itself — including the arm's own `.claude/skills/` and `AGENTS.md`, which are part of the experiment.

This keeps the comparison honest: results measure the agent + the arm, not whatever harness happens to live on your machine.

## Which service for which workbench

| Service | Workbench | Sidecar | Port |
|---|---|---|---|
| `runner` | `workbench-01-nest-graphql-api` (default) | MongoDB (auto-started) | 3000 |
| `runner-web` | `workbench-02-react-admin` (default) | none — MSW mocks the backend | 3010 (`with-schematics`) / 3011 (`without-schematics`) |

`WORKBENCH=` overrides the default workbench of either service; `bench.sh` detects the flavour (Nest vs Vite) from the mounted arm itself.

## One-time setup

```bash
claude setup-token          # on your machine, requires a Claude subscription
cp .env.example .env        # paste the token into .env (gitignored)
docker compose build        # ARM can be anything for building: ARM=with-schematics docker compose build
```

## Run an arm interactively

```bash
# Workbench 01
ARM=with-schematics docker compose run --rm runner
# Workbench 02
ARM=with-schematics docker compose run --rm runner-web
ARM=without-schematics docker compose run --rm runner-web
```

That drops you into an interactive Claude session at `/workspace` (the arm, bind-mounted read-write so results persist on the host for `git diff` afterwards). The entrypoint copies `.env.example` → `.env` if missing and runs `pnpm install --frozen-lockfile` before handing over.

To get a shell instead of Claude:

```bash
ARM=with-schematics docker compose run --rm runner-web bash
```

`docker compose run` does not publish ports; to reach the app from the host add `--service-ports` and start it from a shell (`pnpm dev:mock`). For `runner-web` set `WEB_PORT` to the arm's port (3010 with / 3011 without) so parallel arms don't collide:

```bash
WEB_PORT=3011 ARM=without-schematics docker compose run --rm --service-ports runner-web bash
```

Tear down (for wb-01 this also discards the MongoDB data — every run starts with an empty database):

```bash
docker compose down
```

## Measured runs — the standard evaluation protocol

Interactive sessions are for *watching*; measured runs are for *numbers*. Never mix them in the same dataset. `bench.sh` detects the workbench flavour from the mounted arm, gives the agent the canonical prompt, runs the definition of done, and records everything under `../<workbench>/results/`.

### Workbench 01 — full sweep

One run implements the whole benchmark file. The prompt is identical in both arms (`Follow the instruction listed on entities-benchmark.txt`); the schematic advantage must emerge from the project. The script aborts if any benchmark entity already exists (a dirty arm measures nothing).

```bash
ARM=with-schematics    docker compose -p bench-with    run --rm runner bench.sh
ARM=without-schematics docker compose -p bench-without run --rm runner bench.sh
```

### Workbench 02 — batch by batch (amortization)

One measured run = ONE batch of `entities-benchmark.txt`'s schedule, in a fresh session. Earlier batches MUST remain in the tree — the amortization thesis lives in what batch N inherits from batch N−1 — so the dirty check only rejects the arm if the *requested* batch already exists. The prompt is minimal (`Implement Batch N as specified in entities-benchmark.txt.`); the `with-schematics` arm gets ONE extra sentence instructing it to author/use a Project Builder schematic. That sentence is the experiment's only variable.

Full experiment, start to finish:

```bash
# 0. Fresh experiment? Reset both arms first (see Cleaning below), then:
for N in 1 2 3 4 5; do
  ARM=with-schematics    docker compose -p bench-with    run --rm runner-web bench.sh $N
  ARM=without-schematics docker compose -p bench-without run --rm runner-web bench.sh $N
done
```

Run batches in order (relations point at earlier batches) and both arms of a batch back to back. Between batches there is nothing to clean and nothing to commit: the generated modules are gitignored by design and persist on disk, which is exactly what the next batch needs.

Each run produces `results/<stamp>_<arm>[_batchN]/`:

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

1. **Clean arm before every measured run** (wb-01) / **before every fresh experiment** (wb-02) — see Cleaning below. The script enforces the relevant dirty check and aborts.
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
   # wb-01 (run output is untracked):
   git checkout -- <workbench>/<arm> && git clean -fd <workbench>/<arm>
   # wb-02 (run output is GITIGNORED — the -x flag is what removes it):
   git checkout -- <workbench>/<arm> && git clean -fdx <workbench>/<arm>
   ```

   wb-01 note: cleaning the whole workbench directory also deletes untracked `results/` runs — move any scorecard you want to keep out of the way (or commit it) first. wb-02 note: `results/` is gitignored and lives outside the arms, so cleaning an arm never touches scorecards — but clean between EXPERIMENTS only, never between batches.

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

Versions are build args in the `Dockerfile` (claude-code, pnpm, bun, pbuilder, playwright). Bump them deliberately — a benchmark where the toolchain drifts between runs compares nothing. `PLAYWRIGHT_VERSION` MUST match the `@playwright/test` version in the web arms' `pnpm-lock.yaml` (each Playwright release pins its own browser build). Rebuild after changing:

```bash
docker compose build
```

`pbuilder` installs from the GoReleaser Linux tarball (the same artifact the brew cask wraps), exposing the `builder` binary the `with-schematics` arm needs.
