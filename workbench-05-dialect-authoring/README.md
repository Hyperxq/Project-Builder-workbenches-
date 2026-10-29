# Workbench 05 — Schematic authoring: dialects against string surgery

**Status**: configured, not run. No scorecards yet.

**Question**: when an agent writes a Project Builder schematic, does editing files through the `@pbuilder/sdk` dialects make it faster or cheaper than reading the file and rewriting it as a string, at the same correctness?

Workbenches 01 to 04 measure agents *using* schematics. This one measures agents *authoring* them. It follows a finding from a stopped workbench 03 sweep: the agent read the documented dialect operations and still wrote every schematic with string surgery, because its first schematic set a line-editing style the rest copied.

## The task

The base is the workbench 03 React admin, with the Project Builder toolchain installed and one registered entity (Authors). The agent authors four schematics, one per registration edit every new entity repeats (`harness/tasks/author-registration-schematics.md`). Their dialect coverage is deliberately uneven:

| Schematic | Edits | Dialect coverage |
|---|---|---|
| `sidebar-entry` | `src/app/shell/app-sidebar.tsx`: icon import, `NAV` entry | full: `addImport`, `addArrayElement` |
| `overview-card` | `src/routes/index.tsx`: icon import, card in the Entities section | full: `addImport`, `addJsxChild` |
| `handlers-registration` | `mocks/handlers.ts`, `mocks/setup-test-mocking.ts`: imports, spread in `return [...]`, reset in `afterEach` | partial: `addImport`; the spread and the reset need `.modify()` |
| `route-keys` | `mocks/core/types.ts`: five members of the `MockRouteKey` union | none: `.modify()` or text |

## Arms

| Arm | Recorded as | Context |
|---|---|---|
| A: commons only | `without-schematics` | `harness/arms/arm-a.md`: edit with `find().read()` + text + `replaceContent`, no dialect import; the skill's Dialects section is removed (`deltas/without-dialects`) |
| B: dialects | `with-schematics` | `harness/arms/arm-b.md`: look up each edit in `dialects.md` and use its op; string surgery only where no row matches (`deltas/with-dialects`) |

Both arms author schematics; the dashboard's two arm names are reused, and the experiment's cohort labels say which is which. `deltas/with-dialects/.claude/skills/pbuilder/dialects.md` is the intent table: what you want to do, the file type, the op, and its notes, for every 0.12.0 dialect op, checked against the SDK's own declarations.

## Scoring, outside the agent

`harness/checker/check.sh` runs in the run's container after the agent is done, on clean copies of the base commit that carry only the agent's `schematics/` and manifest:

1. the agent's own `bun test schematics`, and `builder info` for each schematic;
2. every schematic applied for two new entities (`books`, `coupons`), then checked by `assertions.py`, which ignores formatting;
3. a second run of everything changes nothing;
4. with stub modules for the new entities, `pnpm typecheck`, `pnpm lint` and `pnpm test:run` pass;
5. the same edits on reformatted copies of the five target files (`checker/variants/`);
6. each schematic refuses, and writes nothing, when the code it edits around is renamed.

A run is correct when steps 2 to 4 pass. Steps 5 and 6 and a byte-for-byte match with `checker/expected/` are recorded beside it. `harness/reference/` holds reference schematics written with the dialects: they produce `checker/expected/`, pass every check, and served to validate the checker, together with a deliberately broken string-surgery schematic that it rejected.

Two SDK behaviours the reference ran into, both written into `dialects.md` or the task: `label` is a reserved input name, so the display name input is `title`; and `addJsxChild` indents only the first line of a multi-line child.

## Protocol

One headless agent per run (`claude -p --bare`, `claude-opus-5-5`, `--max-budget-usd 20`) in a fresh container from the `claude-runner` image; dependencies install before the clock starts. Runs are sequential, never in parallel, and the arm order alternates per repetition; 3 runs per arm. The hypothesis is registered in `workbench.json` before any run.

## Run it

```bash
docker compose -f ../claude-runner/docker-compose.yml build runner-web   # the claude-runner image
harness/bin/batch.sh                                                       # REPS=3 by default
python3 -I harness/bin/make_bench.py                                       # scorecards into results/
```

`run.sh` reads the API key from the macOS Keychain (`anthropic-api-key`) and keeps run logs under `~/pb-experiment/wb05/runs`.
