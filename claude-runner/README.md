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

Interactive sessions are for *watching*; measured runs are for *numbers*. Never mix them in the same dataset. A measured run executes one entity on one arm with a fixed canonical prompt, then runs the full definition of done, and records everything under `../<workbench>/results/`:

```bash
ARM=with-schematics    docker compose -p bench-with    run --rm runner bench.sh books
ARM=without-schematics docker compose -p bench-without run --rm runner bench.sh books
```

Each run produces `results/<stamp>_<arm>_<entity>/`:

| File | Contents |
|---|---|
| `bench.json` | The scorecard — see schema below |
| `claude-output.json` | Raw agent telemetry (`claude -p --output-format json`) |
| `gate-{tsc,lint,test,e2e}.log` | Full output of each definition-of-done gate |
| `claude-stderr.log` | Agent stderr, for debugging failed runs |

`bench.json` schema:

```json
{
  "date": "…",
  "arm": "with-schematics",
  "entity": "books",
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

1. **Clean arm before every measured run** — from the repo root: `git checkout -- <workbench>/<arm> && git clean -fd <workbench>/<arm>`. A run against a dirty arm measures nothing.
2. **Same entity, both arms, back to back** — hardware and network conditions stay comparable.
3. **N ≥ 3 runs per entity per arm** — AI is variant; a single run is an anecdote, not a measurement. Compare medians.
4. **Consistency check**: diff the generated code *between runs of the same arm*. Identical task, identical standard — how identical is the output?
5. Tokens are the primary cost metric; `cost_usd` is the API-equivalent price and is informational when running under a subscription.

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
