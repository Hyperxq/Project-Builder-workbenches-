# Time analysis — with-schematics batch 2 (Supplier, Coupon, Warehouse)

**$12.59 / 62 turns / 1615s** vs control **$12.88 / 55 / 2357s** → **−$0.29 / −742s (−31% wall)**.
The arm's only pure-harvest batch (zero schematic authoring) — its floor. All gates green.

## Phase timeline (wall clock)

| Phase | Duration | What happened |
|---|---|---|
| Context + baseline (∥ scout) | 6m35s | References + gates; scout inventoried patterns in parallel |
| Plan authoring | 2m08s | 487-line plan — every design decision pre-made for the mechanics |
| Shared prep (W1) | 1m19s | `list-query.ts` extracted + 12 retrofit edits across 4 domains |
| **pbuilder generation** | **13s** | 3 composite runs → 33 file-touches (18 new files + 15 wiring edits), zero errors |
| Generated-output review | 55s | Orchestrator verified every generated file |
| **3 mechanics in parallel** | **9m16s** | ≈21m of agent time compressed; all bespoke T2 work hand-written |
| Gates + fixes | 4m33s | 2 hand-written-test failures (below), then full chain green |
| Close-out | 25s | Plan outcome |

## Why it beat control on wall but tied on cost

1. **Wall −31% = 13s of generation + parallelism.** Generation made the three modules
   file-disjoint (all shared-file wiring pre-applied), which is what allowed 3 mechanics
   to run concurrently. API time (2209s) > wall (1615s) is the fingerprint.
2. **Cost −2% only, because generation eliminates the cheap tokens.** The generated
   layers are low-entropy output; the expensive part — each mechanic re-reading ~26-31
   reference files (11.3M sonnet cache-read tokens = 60% of run cost) — is untouched.
   Parallelism buys wall time *by duplicating context*.
3. **Total rework: 2 errors, both in hand-written tests** (a `getByText` race with a
   refetch skeleton; a Playwright substring collision "Capa**city**"/"City"). Zero
   errors in generated or wired code.
4. Residual friction even in the best case: duplicate gate runs across agents (~28
   local runs), 55s trust-but-verify on generated output, throwaway Zod-API probes.
