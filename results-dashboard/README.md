# results-dashboard

Static dashboard that interprets every workbench's measured runs. It globs
`../workbench-*/results/*/bench.json` at build time (`import.meta.glob`),
groups runs by workbench → arm → batch, and renders:

- side-by-side arm cards (cost, wall time, turns, tokens, files, LOC, DoD)
- for batched workbenches: cumulative + marginal cost charts with the
  break-even batch marked
- the full runs table with per-gate pass/fail chips

Reruns of the same arm+batch supersede older attempts within a sweep;
every recorded run still shows in the table. Design language: Vercel
(`DESIGN.md`).

## Experiments

Each workbench page opens with a lab notebook: hypothesis, conditions,
result. Experiments are declared in `<workbench>/workbench.json` under
`experiments`, ideally before their runs exist:

```json
{
  "id": "wb03-route-sonnet",
  "title": "Sub-agents on Sonnet 5.5 instead of Opus 5.5",
  "registered": "before-runs",
  "hypothesis": "Pinning the sub-agents to Sonnet 5.5 costs at least 30% less, at no worse quality.",
  "variable": "The scout and mechanic sub-agents' model.",
  "constants": ["Orchestrator on claude-opus-5-5"],
  "treatment": { "label": "Sonnet sub-agents", "sweeps": ["wb03-v3-route-sonnet"], "expected_runs": 10 },
  "baseline": { "label": "Opus sub-agents", "sweeps": ["wb03-v3-sdk010"], "expected_runs": 10 },
  "prediction": {
    "combine": "all",
    "criteria": [{ "metric": "cost_usd", "aggregate": "sum", "max_change_pct": -30 }]
  }
}
```

- A cohort is a list of sweep IDs (legacy runs are `legacy:<model>`), with
  `arms` to keep only one arm; both arms are pooled when it is omitted.
- `metric` is `cost_usd`, `wall_seconds`, `api_seconds` or `tokens_all`
  (cache reads included); `aggregate` is `sum` or `median` per run. A
  criterion is met when `(treatment − baseline) ÷ baseline × 100` is at or
  below `max_change_pct`; `combine` says whether all or any must be met.
- The status is computed: **pending** until both cohorts have runs,
  **inconclusive** below `expected_runs` or with a metric missing,
  **refuted** when the treatment passes its gates less often, misses the
  prediction or fails a `recorded_checks` entry (a measurement taken
  outside the scorecards, such as review rounds, with its `source`), and
  **supported** otherwise.
- `interpretation` is shown beside the status and never changes it.
  `registered: "after-runs"` marks a hypothesis written once the results
  were known.

## Run

```bash
pnpm install
pnpm dev        # http://localhost:3020
```

New `bench.json` files live OUTSIDE the Vite root, so the dev server picks
them up on restart — not on hot reload. Restart `pnpm dev` after a benchmark
run.

## Deploy

Pushed to GitHub Pages on every push to `main` (`.github/workflows/pages.yml`).
Only `bench.json` scorecards are committed (the heavy run artifacts — agent
streams, gate logs — stay local), so the published page is always as fresh as
the last pushed scorecard.

## For agents: `llms.txt`

Every build also emits `llms.txt` at the site root
(https://hyperxq.github.io/Project-Builder-workbenches-/llms.txt): plain
markdown with the latest experiment of each workbench under `## Latest` and
every earlier one under `## History`, each with its hypothesis, the status
`evaluateExperiment` computes, every predicted metric and the pass rates. It is
generated from the same `workbench.json` and `bench.json` files on each deploy,
so it is never edited by hand. `pnpm dev` serves it at `/llms.txt`. The latest
experiment of a workbench is the last one declared in its `workbench.json`
that has runs.

## Checks

```bash
pnpm typecheck && pnpm test:run
```
