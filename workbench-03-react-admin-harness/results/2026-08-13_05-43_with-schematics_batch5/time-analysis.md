# Time analysis — with-schematics batch 5 (Subscription, Employee)

**$12.23 / 57 turns / 1847s** vs control **$10.81 / 59 / 2348s** → **+$1.42 / −501s (−21% wall)**.
Final batch; library frozen at 10 schematics — nothing created, extended, or patched.
All gates green.

## Phase timeline (wall clock)

| Phase | Duration | What happened |
|---|---|---|
| Boot + context | 0.4m | |
| Baseline gates ∥ scout | 5.0m | Scout's harvest audit: read all 10 schematics + prior plans to conclude "extract nothing" |
| Orchestrator re-verifies scout claims | 4.5m | ~15 targeted reads/greps |
| Plan write | 3.5m | Single 46.3KB write |
| **Generation** | **0.5m** | 2 composite runs: 2.4s + 0.4s, 26 files |
| **2 mechanics in parallel** | **7.4m** | vs control's sequential 10m + 6.4m |
| Gate run 1 + e2e fixes | 4.8m | 3 e2e test-side issues fixed in ONE consolidated batch (below) |
| Full chain + schematics suite | 1.8m | |
| End-state census + close-out | 0.8m | 75 route keys / 16 NAV / 10 schematics verified |

## Why −21% wall but +$1.42 cost

1. **Wall win = de-serialization, not typing savings.** X1/X2 pre-applied every
   shared-file edit in 3s → mechanics file-disjoint → parallel. Control was sequential
   by necessity (each mechanic edits `types.ts`/`handlers.ts` itself).
2. **Declared rules measurably worked**: batch-4's pre-recorded rules (inline-PATCH
   `mutateAsync` core; two-schema wire/form split) were CONSUMED, not re-derived — one
   reference read, one write, zero subsequent edits on both mechanisms; the generated
   edit page compiled untouched. Control paid three separate gate-fix loops; this arm
   paid one consolidated e2e fix batch.
3. **The +$1.42 is harvest-mode bookkeeping that stops amortizing at 2 entities**:
   ~⅔ cache-read volume — the 46KB plan riding every turn of two concurrent mechanic
   contexts, plus the scout reading the whole library to justify extracting nothing.
   ~¼ the bigger plan itself. **Not rework** — this arm's error bill was smaller than
   control's.
4. Errors: 1 trivial tsc slip + 3 e2e test-side issues (Playwright can't `.check()` a
   visually-hidden radio — new standing hazard; a redirect assertion invalidated by the
   non-persisted role store; 2 wrong-element locators). Zero schematic issues; red-tree
   friction fully eliminated by plan-ordered sequencing (the batch-1 lesson,
   institutionalized).
