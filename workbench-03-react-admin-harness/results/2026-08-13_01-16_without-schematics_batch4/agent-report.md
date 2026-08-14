Batch 4 is done — Shipment [T2], Ticket [T2], Event [T3], all four gates green.

**Phase 1 — PLAN.** Wrote `plans/batch-4.md` after a `scout` pass over the tree. No `plan-directives/` exist. The scout's key findings: the embedded object, the cross-field refine, the enum URL filter and the row-level PATCH are all established idioms; genuinely new were the bulk selection machinery, the numeric enum, the two-parameter date range, and the whole publish workflow (no 422 helper, no 6th route, no detail-page action, no upsert schema that omits a stored field).

**Phase 2 — BUILD.** Four serialised waves, each blocking, each reviewed before the next:

- **Wave 0 (me):** `unprocessable()` (422) in `mocks/core/errors.ts`.
- **Wave 1 Shipment:** embedded `destination`, `shippedAt`-required-when-`delivered` (client + server, enforced against the merged object on PATCH), and the bulk "Mark delivered" bar.
- **Wave 2 Ticket:** numeric `priority` enum with a label table and a destructive-tone High badge, `?from&to` range filter, row-menu Close/Reopen.
- **Wave 3 Event:** `eventUpsertSchema = eventSchema.omit({ published: true })`, publish/unpublish on the detail page, 422 guard for past start date or zero seats.

Three design calls worth flagging, all recorded with rationale in §3:

1. **Publishing goes through `PATCH`,** not a new action route — `AGENTS.md`'s five-route contract holds, with `setPublished` as a separate API method so `EventUpsert` never grows `published`.
2. **The bulk action uses `Promise.allSettled` and reports partial failure** rather than synthesising a `shippedAt`. Quirks (a) and (b) genuinely collide: marking an unshipped row delivered *is* invalid, so the toast reads `1 of 2 shipments updated` and the failed row stays selected.
3. **Publish failures render a persistent inline alert, not a toast** — the guard's reason is something the user has to read.

**Phase 3 — VERIFY.** One e2e failure surfaced and was fixed: `getByText('Published')` matched three nodes because "Published" is a substring of the "Unpublish" button. That's the existing substring-matching trap in a new guise, so I fixed it with `{ exact: true }` and recorded it for batch 5. I also aligned two mechanic deviations myself — straight quotes in Shipment's delete dialog, and Event's PATCH storing the merged object instead of an explicitly trimmed one.

Final foreground run: `typecheck` pass · `lint` pass · `test:run` **40 files / 348 tests** · `test:e2e` **110 tests** (30 new: shipments 10, tickets 11, events 9).
