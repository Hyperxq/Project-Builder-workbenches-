# Workbench 03 — Sweep v2 causal analysis: where the with-schematics arm's money and time actually went

Both arms: 5 batches, 15 entities, 10/10 DoD first-attempt PASS, opus-5 orchestrator +
sonnet-5 scout/mechanic sub-agents, model-pinned. Source of truth: `bench.json` scorecards
in this directory plus forensic mining of each with-arm `claude-stream.jsonl` (full
per-batch reports in engram, topics `workbench-03/forensic-b1`..`b5`).

## Headline numbers

| | B1 | B2 | B3 | B4 | B5 | Total |
|---|---|---|---|---|---|---|
| without — cost | $13.65 | $12.88 | $13.78 | $15.50 | $10.81 | **$66.62** |
| with — cost | $22.23 | $12.59 | $20.27 | $18.41 | $12.23 | **$85.73 (+29%)** |
| without — wall | 2439s | 2357s | 2174s | 2555s | 2348s | **11873s** |
| with — wall | 3471s | 1615s | 2638s | 2322s | 1847s | **11893s** |

Cumulative cost never crossed; the README's prediction 2 (crossover before batch 5) is
**falsified**. Wall time tells the opposite story: identical totals, but the with arm loses
all of its time in batch 1 and beats the control on wall in every subsequent batch
(−31%, +21%*, −9%, −21% — *B3 re-paid authoring).

## The batch cost model the sweep validates

```
with-arm batch cost ≈ authoring tax (if the plan extracts/extends anything)
                    + bespoke work (carrying the multi-agent context floor)
                    − generation savings (proportional to how templatable the entities are)
```

- B2 ($12.59, −2% cost, −31% wall): zero authoring + template-heavy entities → the arm's floor.
- B1/B3 (+63%/+47%): authoring rounds — batch 1 built 8 schematics, batch 3 extracted 2 more
  and extended the composite. The tax **recurs**; it is not a batch-1 one-off.
- B4 (+19% with zero authoring): bespoke-dominated entities → generation's share of the work
  was small, and one debug loop supplied most of the delta (below).
- B5 (+13% cost, −21% wall): harvest on 2 entities — fixed bookkeeping (library audit,
  46KB plan riding two concurrent contexts) stops amortizing at small batch sizes.

## Attribution 1 — Recurring authoring tax (the largest single cause)

- **B1**: ~33% of the entire run (190 of 566 agent events) went to scaffolding, authoring,
  unit-testing, executing, and documenting 8 schematics — 40 generator files the control
  never wrote. Generation itself was nearly free (9 clean `builder execute` runs).
- **B3**: extraction of `crud-create-page`/`crud-edit-page` + extending the `crud-module`
  composite = 65–75% of that batch's +$6.49. Extending the composite (52 calls / 2.77M
  tokens) cost the same as authoring the two new schematics — a membership edit priced as
  code because the composite *is* code (→ SDK issue #75, declarative composites).
- **B4/B5**: the plans argued every extraction decision to "no" (Rule 1 fails on
  remaining-repetition arithmetic, not on proof) at **no measurable opus premium** —
  deliberation-to-freeze is free; only actual authoring costs.

## Attribution 2 — The multi-agent context floor (why generation saves so little money)

Mechanics re-read ~30–45 reference files before their first write, **regardless of what was
generated** — the knowledge cannot be transferred between sub-agent contexts, only
re-derived. Consequences measured:

- B2: 60% of run cost was sonnet cache-reads (11.3M tokens across parallel mechanics).
- B3 module-level token comparison vs control: Vehicle (max generation coverage) **+10%
  more expensive than hand-writing it**; whole-module total only −6%.
- B4: mechanic token cost at parity with control when nothing breaks; generated boilerplate
  saves write-tokens the mechanic re-spends reading.
- B5: ~⅔ of the +$1.42 was cache-read volume — the plan riding every turn of two
  simultaneously live mechanic contexts.

Generation eliminates the *cheap* third of the tokens (low-entropy output) and cannot touch
the expensive two-thirds (context ingestion + verification). Parallelism converts wall time
into concurrent context billing — which is exactly why wall and cost move in opposite
directions. The cost lever here is a shared context pack / work-order excerpting, not more
schematics.

## Attribution 3 — Errors: small, hand-written, and once ironic

Across all 5 with-arm batches, **zero generated files were ever patched after generation**
and no schematic template failed. One CLI-level failure total (B4: multiline `--extraSearch`
value rejected; 30s retry). Every other failure was in hand-written code — overwhelmingly
test authoring (locator ambiguity, fixture-sorts-to-page-3, skeleton-vs-getByText races).

The one expensive bug (B4, ≈$2.10, 6.5 min — ~72% of that batch's delta): the Ticket
mechanic faithfully transplanted the *harvested* per-row PATCH pattern into a Radix
dropdown item, whose unmount-on-select silently drops react-query's call-level `mutate()`
callbacks — toast never fires. The control arm dodged it accidentally with a page-level
handler. Lesson: **pattern libraries need host-context caveats, not just shapes** — B5 then
consumed that fix as a declared rule with zero rework, which is the countercase proving the
mechanism works when the caveat is recorded.

## Attribution 4 — Work that was never apt for schematics

The plans themselves ruled most of every entity out of generation scope: domain Zod schemas
("it IS the per-entity specification"), fixtures/mocks, forms, list/detail pages beyond
chrome, section tests and e2e ("would assert nothing entity-true"). On quirk-dominated
batches (B4: three different inline-PATCH triggers, Event's wire/form `.omit()` split,
embedded fieldsets) generation covered ~50% of files but ~0% of decisions. Schematics were
never *in the way* — mechanics built around generated skeletons cleanly — they simply don't
address where T2/T3 money goes.

## Attribution 5 — Avoidable operational friction (found, then fixed by the arm itself)

- **Skeleton-first red tree**: generating all modules' scaffolding before any mechanic
  implements them leaves the tree broken for every parallel agent. B1: blocked one mechanic
  (~12 events of workarounds) + shipped a latent e2e bug. B4: recurred mild (per-module
  typecheck filtering). B5: **eliminated** by plan-ordered sequencing. Structural fix:
  just-in-time per-module generation (SDK issue #75's `--only`).
- **oxlint silently skips `schematics/`** (gitignored → never scanned): ~12-call
  investigation in B1; permanent trap for any gitignored generator workspace.
- **SDK API spelunking**: duplicated across parallel agents in B1 and again in B3 —
  the trust-requires-reading-source tax (→ SDK issue #74, derived effects contracts).

## What the schematics actually bought

1. **Wall time via de-serialization** — the decisive mechanism. The generator applies all
   shared-file registrations up front, making mechanics file-disjoint and therefore
   parallel-safe: B4 built 3 modules in 15.2 min vs control's 26 min sequential; B5 −21%
   wall. This — not typing speed — is the real product.
2. **Defect elimination in the generated layer**: zero patches, zero wiring mistakes across
   5 batches; the arm's rework was consistently smaller and more consolidated than the
   control's separate fix loops (B5: one batch of e2e fixes vs three control loops).
3. **Declared rules as institutional memory**: B4's recorded hazards and mechanism rules
   were consumed by B5 mechanics as pre-derived knowledge — one read, one write, zero
   rework on both pre-declared T3 mechanisms.
4. **Predictability**: with-arm batch wall times after B1 (1615–2638s) sit at or below every
   control batch; DoD 10/10 on both arms, so quality was never the differentiator.

## Implications

- **For pbuilder**: project-builder-sdk#74 (engine-derived effects contracts — kills the
  per-batch library-audit read tax and makes preconditions machine-checkable) and #75
  (declarative composite manifests — membership edits become data; `--only` enables
  just-in-time generation, killing red-tree friction).
- **For the harness**: the cost lever is context, not generation — shared context packs /
  tighter work-order excerpting for mechanics.
- **For WB-04** (mature library, grown codebase, both arms continue): prediction — the with
  arm converges to its harvest floor with large wall-time wins and roughly cost-parity;
  the without arm stays flat-to-rising (verification and context scale with tree size,
  pattern benefit saturated). A fresh horizon also re-opens extraction for patterns
  rejected on repeats-ahead arithmetic (embedded fieldset, inline-PATCH core).
