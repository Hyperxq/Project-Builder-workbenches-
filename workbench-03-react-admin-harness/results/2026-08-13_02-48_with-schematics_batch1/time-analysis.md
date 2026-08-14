# Time analysis — with-schematics batch 1 (Book, Category, Review)

**$22.23 / 67 turns / 3471s** vs control **$13.65 / 40 / 2439s** → **+$8.58 / +1032s**.
All 4 gates green first attempt. Topology: opus orchestrator + 8 sonnet sub-agents
(scout, shared-prep, 3 schematic authors, 3 module mechanics); 566 agent events total.

## Phase timeline (share of run effort)

| Phase | Share | What happened |
|---|---|---|
| Context + baseline gates (∥ scout) | ~10% | Specs, full Authors reference, pbuilder docs; 4-gate baseline |
| Planning | <1% | 348-line plan incl. the 13-row extract/defer decision table |
| Shared prep | 4% | pagination edit, iso-date module + tests |
| Schematic scaffolding | 1% | `builder new schematic` ×7 |
| **Schematic authoring + testing (2 parallel authors)** | **24%** | 7 schematics × (schema + helper + factory + tests) = 40 generator files; codegen ×5, `bun test` suites |
| Generation Book + review | 2% | 7 `builder execute` calls, all clean first try |
| Composite authoring (crud-module) | 5% | Written only after the 7 atomics proved on Book |
| Generation Category + Review | <1% | 2 composite runs |
| **Hand-written module work (3 mechanics)** | **41%** | Domain schemas, fixtures, mocks, presentation, tests, e2e — everything the plan deferred from generation |
| Final verification + fixes | 3% | 1 e2e failure (latent, see below), full re-run |

## Why it lasted 1032s longer than control

1. **The authoring round is ~33% of the run** (~190 of 566 events): scaffold, author,
   unit-test, execute, and document 8 schematics the control never built. Generation
   itself was nearly free — the cost is crystallizing and safeguarding the generators.
2. **Arm-unique friction (~15%)**: oxlint silently skips the gitignored `schematics/`
   dir (~12-call investigation to discover lint was scanning nothing); two parallel
   authors independently spelunked `@pbuilder/sdk` dist typings to learn the API.
3. **Sequencing own-goal (~10%)**: Review's scaffolding was generated before its
   mechanic implemented it → the Category mechanic never had a clean tree
   (typecheck/build/vitest workarounds) and shipped a latent e2e locator bug that cost
   another fix loop at final gates. Fix adopted in later batches: generate just-in-time.
4. Bespoke rework (Review's T2 form/e2e, ~24 events) was ordinary hand-building error —
   the control was equally exposed; it does not explain the delta.

**Zero schematic failures**: no generated file was ever patched; Review's variations
entered through declared inputs (`extraSearch`, `keyType=number`).
