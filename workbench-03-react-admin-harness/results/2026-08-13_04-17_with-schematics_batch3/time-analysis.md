# Time analysis — with-schematics batch 3 (Vehicle, Invoice, Payment)

**$20.27 / 65 turns / 2638s** vs control **$13.78 / 39 / 2174s** → **+$6.49 / +464s**.
The re-crystallization batch: proof the authoring tax recurs. All gates green.

## Phase timeline (wall clock)

| Phase | Duration | What happened |
|---|---|---|
| Context + baseline | 53s | |
| Scout | 1m25s | Pattern inventory |
| **Planning incl. extract-vs-not deliberation** | **10m17s** | Opus ran `sed`-normalized `diff` experiments proving create/edit pages byte-identical across 7 entities; 800-line plan |
| Shared prep ∥ **new schematic extraction (S1)** | 3m53s | `crud-create-page` + `crud-edit-page` authored + `bun test` (52 calls) |
| Proving on Vehicle | 53s | Both new atomics executed + byte-diffed |
| **crud-module composite extension (S2)** | **4m19s** | +`labelField`, compose the 2 new atomics, composite-test rework (52 calls) |
| Generation Invoice + Payment | 1m39s | Extended composite, incl. `?method` extraSearch |
| 3 mechanics in parallel | 12m25s | Invoice the heaviest (combobox + inline PATCH + embedded billing) |
| Verification + fixes | 7m | 1 e2e assert rewritten (URL search defaults), Select warning polish, chains re-run |

## Why it lasted 464s longer than control

1. **The re-crystallization round ≈ the entire wall delta (~500s) and 65-75% of the
   cost delta (~$4-4.8)**: S1 (extract 2 schematics) + S2 (extend composite) + the opus
   deliberation/proving. Batch 3 is the third consecutive batch paying authoring tax —
   it is not a batch-1 one-off.
2. **Extending the composite cost as much as authoring the new atomics** (52 calls /
   2.77M tokens vs 52 / 2.05M) — a membership edit priced as code, because the
   composite IS code (→ SDK issue #75, declarative manifests).
3. **Generation leverage on modules ≈ nil in tokens**: Vehicle (max generated coverage)
   cost +10% MORE than control's hand-written Vehicle; module total only −6%. Mechanics
   re-read ~45 reference files before writing regardless of what was generated.
4. Red-tree friction recurred mildly (S2 ran gates on a deliberately-red skeleton tree,
   ~10 calls of "expected, not mine" archaeology).
5. Rework was small (~$0.5-0.8) and all test-authoring/polish — none caused by
   schematic output; zero generated files patched.
