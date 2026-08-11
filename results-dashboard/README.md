# results-dashboard

Static dashboard that interprets every workbench's measured runs. It globs
`../workbench-*/results/*/bench.json` at build time (`import.meta.glob`),
groups runs by workbench → arm → batch, and renders:

- side-by-side arm cards (cost, wall time, turns, tokens, files, LOC, DoD)
- for batched workbenches: cumulative + marginal cost charts with the
  break-even batch marked
- the full runs table with per-gate pass/fail chips

Reruns of the same arm+batch supersede older attempts in the comparisons;
every recorded run still shows in the table. Design language: Vercel
(`DESIGN.md`).

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

## Checks

```bash
pnpm typecheck && pnpm test:run
```
