Batch 2 is complete — Supplier [T1], Coupon [T2], Warehouse [T2] — with all four gates green.

**Phase 1 — PLAN.** Wrote `plans/batch-2.md` after a `scout` pattern inventory: Supplier is a ~90 % Author mirror (its one real deviation: first entity in the tree with no boolean, so `supplierUpsertSchema` is an alias, not an `.extend()`); Coupon's base CRUD exists but all three quirks are new ground; Warehouse's `location` is the first embedded object. Look-ahead was quantified against batches 3–5 (the refine mechanism recurs in Payment/Shipment, the enum filter in Payment/Event, embedded objects in Invoice/Shipment, and `supplierExists()` feeds Invoice's relation).

**Phase 2 — BUILD.** Wave 0 was mine: `src/shared/lib/dates.ts` (`todayIso`, `isoDateOffset`), because nothing in the tree read the current date and no test infrastructure freezes the clock — fixtures and tests compute dates relative to today instead of using literals that would rot. Then three sequential `mechanic` delegations (serialised: all three edit the same five shared files), each reviewed against the plan before the next.

Quirks implemented and tested: create-only future-expiry as a field error via a mode-dependent schema factory (edit keeps past dates, server enforces on POST only); derived Active/Disabled/Expired status owned by the domain so list, detail and mock filter can't disagree; `?status` enum filter through the locked route → list-params → `toQueryString` → mock-parser idiom; `location` as a `FieldSet`/`FieldLegend` group with per-nested-field validation messages, plus the City column.

**Phase 3 — VERIFY.** First full run surfaced 5 e2e failures, both defects in the specs rather than the app: `getByLabel('City')` matched two inputs because Playwright matches labels by substring and "Capa**city**" ends in "city"; and the coupons detail/delete tests targeted `SUMMER10`, which the code-sorted list places off page 1. I fixed both and re-ran.

| Gate | Result |
|---|---|
| `pnpm typecheck` | pass |
| `pnpm lint` | pass |
| `pnpm test:run` | 21 files / 156 tests |
| `pnpm test:e2e` | 53 tests |

Execution record, including the two fixes and the annotation `zodResolver` needed on the schema factory, is appended to `plans/batch-2.md` §6.
