# Workbench 06 — Pattern recognition and a schematic catalog

**Status**: run on 2026-10-30. Experiment 2: 10 sequences. Experiment 3: 3 sequences per arm; hypothesis not supported.

Workbenches 01 to 05 hand the agent a schematic, or tell it to write one. This one asks two questions closer to everyday work, on a sequence of small product changes:

- **Experiment 2**: given the option to author schematics and no rule about when, does the agent notice that a change repeats and automate it? At which repetition, and does it use what it built?
- **Experiment 3**: given a catalog of reviewed schematics, some of them distractors, and no hint about which to use, is the sequence cheaper than writing everything by hand?

## The sequence

The base is the workbench 03 React admin with one entity (Authors) and the Project Builder toolchain, at version 1.4.0. Ten prompts in `harness/tasks/`, always in `sequence.json` order, one headless session each:

| Task | Change | Pattern |
|---|---|---|
| T01 | optional `website` (valid URL) | P1 |
| T02 | Help page at `/help` | P2 |
| T03 | author count on the Overview's Authors card | one-off |
| T04 | optional `birthYear` (1000 to 2100, number input) | P1 |
| T05 | About page at `/about` | P2 |
| T06 | optional `bio` (at most 500 characters) | P1 |
| T07 | app version from `package.json` in the sidebar footer | one-off |
| T08 | Changelog page at `/changelog` | P2 |
| T09 | optional `penName` | P1 |
| T10 | `Copy email` button on the author detail page | one-off |

P1 is an optional Author field across the domain schema, the create and edit forms, the mock API's create and update, and the detail page, following the existing `country`. P2 is a route file with a heading and a paragraph plus a sidebar entry. The prompts describe the product change only; none mentions patterns or schematics.

A sequence runs in one container (`harness/bin/run-sequence.sh`). No session sees another's conversation; each finds the repository as the previous one left it, committed with the task's first line as the message, so the history is there to read.

## Scoring, outside the agent

`harness/checker/check-task.sh` runs after every session on the repository as the agent left it, then leaves it untouched for the next session:

1. `pnpm typecheck`, `pnpm lint` and `pnpm test:run`, the agent's own tests included;
2. hidden tests (`harness/checker/tests/`) for this task and every earlier one. A task is correct when the gates and its own hidden tests pass; an earlier task's failing tests are recorded as a regression;
3. for T07, the hidden test runs again after `package.json` changes to another version, so a copied version number fails.

The checker was validated without an agent (`harness/reference/validate.sh`): the untouched base fails T01, a footer with the version typed in fails T07, and the reference solution (`harness/reference/solve.py`) passes all ten tasks in order with no regressions.

## Experiment 2: recognition

One condition, no arms: the shipped pbuilder skill, no schematic registered, and a session context (`harness/exp2/context.md`) that only says Project Builder is installed. N = 10 sequences. The definitions (what counts as a schematic for a pattern, when it was created, when it was used, what is a false positive) are pre-registered in `harness/exp2/PROTOCOL.md`; `harness/exp2/analyze.py` implements them and writes `results-recognition/`. Being observational, it is not in `workbench.json` `experiments`.

## Experiment 3: catalog against by hand

| Arm | Recorded as | Setup |
|---|---|---|
| A: by hand | `without-schematics` | no pbuilder skill, no `builder` binary; context `harness/exp3/context-by-hand.md` |
| B: catalog | `with-schematics` | `harness/exp3/catalog` registered; context `harness/exp3/context-catalog.md` says the collection exists and leaves the choice to the agent |

The catalog holds five schematics, each with `bun test` factory tests:

| Schematic | Fits |
|---|---|
| `author-field` | P1 |
| `static-page` | P2 |
| `author-column` | distractor: a column on the Authors list, which no task asks for |
| `redirect-route` | distractor: a route that redirects, close to P2 but renders nothing |
| `overview-card` | distractor: a card on the Overview, close to T03 but not a count |

`harness/exp3/prove-catalog.sh` proves it without an agent: every P1 and P2 task done with one `builder execute` passes the checker, and the three distractors run on the final state with the gates still green. The hypothesis `wb06-catalog` is registered in `workbench.json`: at least 30% lower median cost or tokens per task with the catalog, at no worse correctness, over 3 sequences per arm. `harness/exp3/make_bench.py` writes one scorecard per session and the catalog arm's choices (right use, wrong use, misses, exploration calls) to `results-selection.json`.

## Results

### Experiment 2: what the agent automated on its own

10 sequences, 100 sessions, all correct, no regressions, $27.91 in total (`results-recognition/summary.json`).

| Pattern | Automated | At occurrence | Used after creation |
|---|---|---|---|
| P2, static page | 10/10 | 2nd, every time (T05) | 10/10 (T08) |
| P1, optional Author field | 2/10 | 4th (seq6), 3rd (seq7) | 1/1 (seq7 T09) |
| One-off tasks | no schematic in any sequence: 0 false positives | | |

Median cost per occurrence:

| Occurrence | P1 | P2 |
|---|---|---|
| 1st | $0.41 | $0.12 |
| 2nd | $0.43 | $0.38 (creates the schematic) |
| 3rd | $0.39 | $0.13 (uses it) |
| 4th | $0.36 | — |

The agent recognised the small, uniform pattern every time, even though by hand it costs $0.12 and the schematic saves nothing. It rarely recognised the larger one, whose four occurrences differ in validation (a URL, a number, a length limit, plain text), although that is where a schematic saves: the one reuse cost $0.23 against about $0.40 by hand. When it did automate P1, it scoped the schematic to plain text fields and excluded URLs and numbers. In this sequence, the pattern that is easiest to see is not the one worth automating.

### Experiment 3: catalog against by hand

| Median per task | By hand | Catalog | Change |
|---|---|---|---|
| Cost, all tasks | $0.175 | $0.147 | −16% |
| Tokens, all tasks | 112k | 111k | −1% |
| Wall time, all tasks | 54 s | 52 s | −5% |
| Cost, P1 | $0.32 | $0.27 | −17% |
| Cost, P2 | $0.12 | $0.13 | +9% |
| Cost, one-off | $0.16 | $0.14 | −15% |

Both arms were correct in 30 of 30 sessions with no regressions; total cost was $6.38 by hand and $5.57 with the catalog. The hypothesis (at least 30% lower median cost or tokens) is not supported.

Selection was exact (`results-selection.json`): `author-field` on all 12 P1 tasks, `static-page` on all 9 P2 tasks, no distractor run, no schematic on a one-off task. The catalog saves on P1; on P2 reading the catalog cost more tokens (median 97k against 60k) than the schematic saved.

## Run it

```bash
docker compose -f ../claude-runner/docker-compose.yml build runner-web   # the claude-runner image
harness/exp2/batch.sh && python3 -I harness/exp2/analyze.py              # experiment 2, N=10
harness/exp3/batch.sh && python3 -I harness/exp3/make_bench.py           # experiment 3, 3 sequences per arm
```

Runs are sequential, never in parallel. The API key comes from the macOS Keychain (`anthropic-api-key`) on every session; logs stay under `~/pb-experiment/wb06/`. Forecast: about 100 sessions for experiment 2 and 60 for experiment 3, at roughly $1 each.
