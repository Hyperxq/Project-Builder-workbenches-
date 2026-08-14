# Time analysis — with-schematics batch 4 (Shipment, Ticket, Event)

**$18.41 / 66 turns / 2322s** vs control **$15.50 / 53 / 2555s** → **+$2.91 / −233s wall**.
Zero schematic authoring (the plan argued all 15 extraction decisions to "no" — library
frozen). Quirk-heaviest batch. All gates green.

## Phase timeline (wall clock)

| Phase | Duration | What happened |
|---|---|---|
| Orientation | 0.8m | |
| Scout (parallel) | 2.6m | |
| Planning | 12.6m | 877-line plan; freeze deliberation cost ≈ $0 extra (opus flat vs control) |
| **Generation** | **1.1m** | 4 composite runs (tickets ran twice — first rejected: multiline `--extraSearch` value; 30s retry). 39 files in 68s |
| **3 mechanics in parallel** | **15.2m** | Shipment 7.0m · Event 7.9m · **Ticket 14.3m — includes a 6.5m debug loop** |
| Verification + fixes | 6.0m | e2e run 1: 4 test-side failures → fixed → all green |
| Outcome write | 0.3m | |

## Why +$2.91 despite zero authoring

1. **~72% of the delta is ONE bug (≈$2.10, 6.5m)**: the Ticket mechanic transplanted
   the harvested per-row PATCH pattern (batch-3's `invoice-paid-switch` rule) into a
   Radix `DropdownMenuItem` — which unmounts on select, so react-query silently drops
   call-level `mutate()` callbacks and the toast never fires. 37 messages / 6.38M
   cache-read tokens root-causing it down to `query-core` internals; fixed with
   `mutateAsync().then()`. **Pattern fidelity caused it** — the proven shape moved to a
   host with different unmount semantics; control's page-level handler was accidentally
   immune. Lesson recorded: pattern libraries need host-context caveats, not just shapes.
2. **Opus/orchestration cost is flat vs control** ($5.68 vs $5.64) — arguing the library
   freeze in the plan was free. The delta is entirely sonnet.
3. **Generation leverage in tokens ≈ zero on bespoke-dominated entities** (Shipment −5%,
   Event +32%, Ticket at parity pre-bug): mechanics re-read ~35 reference files
   regardless. Coverage: ~50% of files generated, ~0% of the decisions.
4. **Wall still −9%**: pre-applied shared-file registrations made mechanics
   parallel-safe — 15.2m for three modules vs control's 26m sequential.
5. Red tree recurred mild (parallel siblings filtering typecheck by module); 4 e2e
   fixes all test-side (~2m), including the recurring fixture-sorts-to-page-3 hazard.
