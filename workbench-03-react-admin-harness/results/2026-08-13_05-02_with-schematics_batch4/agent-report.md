**Batch 4 is complete — all four gates green, verified by me in the foreground in a single chain.**

| Gate | Result | Baseline |
|---|---|---|
| `pnpm typecheck` | ✅ exit 0 | exit 0 |
| `pnpm lint` | ✅ exit 0 | exit 0 |
| `pnpm test:run` | ✅ 41 files / 335 tests | 32 / 242 |
| `pnpm test:e2e` | ✅ 102 passed | 75 |
| `pnpm test:schematics` | ✅ 36 / 10 files | unchanged |

**Phase 1 — PLAN.** `plans/batch-4.md` covers modules, the scout's pattern inventory, schematic decisions per `plan-directives/schematics.md`, delegation and verification. The controlling finding: with only two entities left in the schedule, **no** mechanism can meet the directive's "3+ repeats ahead" bar — so the batch creates, extends and patches **zero** schematics. That included closing the embedded-object question batch 3 scheduled for here: the three instances *are* near-byte-identical, but Shipment is the last one, so extraction would produce a generator never run again.

**Phase 2 — BUILD.** Ran `default:crud-module` standalone three times, reviewed the output, then delegated the three modules to `mechanic` in parallel with disjoint file sets. Design decisions stayed in the plan — notably Event's three-schema split, which keeps `published` structurally absent from form values while leaving it optional on the wire, so the generated api/hooks typecheck for the publish PATCH with no patch to generated output.

**Phase 3 — VERIFY.** Four e2e failures, all test-side, diagnosed and fixed in place with no source change: a fixture row asserted onto page 1 when it sorts to page 3, and three text-matching collisions (two where an assertion matched both the content *and* the toast quoting it).

Three things worth flagging:

- **A real bug the plan didn't anticipate.** `TicketOpenToggleItem` initially mirrored Invoice's `mutate(vars, { onSuccess, onError })`. Radix unmounts the dropdown on select, and TanStack Query only fires call-level callbacks while the observer has listeners — so both toasts were silently dropped while the PATCH still applied. Fixed with `mutateAsync`. This is a production bug, not a test artefact, and I've declared the rule for batch 5, where Subscription's "Renew" uses the same control.
- **Two corrections to generated output, both documented rather than silent:** I'd specified `Truck` for Shipments, which Suppliers already uses (→ `Package`), and the `builder` CLI rejects newlines in a flag value while `crud-routes` splits `extraSearch` on them — so Ticket's two search entries went in on one line and I reformatted the whitespace. That's a CLI transport limit, not a schematic shortfall; the generated semantics are identical.
- The `{ exact: true }` hazard was pre-authorised but the mechanics applied it to labels only, not to toast-vs-content collisions. I've restated it in that form for the next plan.

End state: 65 `MockRouteKey` literals, 13 modules wired end to end, 13 e2e specs, 10 schematics unmodified.
