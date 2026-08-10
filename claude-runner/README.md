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
