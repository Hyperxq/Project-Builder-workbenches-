Batch 3 is delivered and closed. All four gates green in one foreground chain:

| Gate | Result |
|---|---|
| `pnpm typecheck` | ✅ exit 0 |
| `pnpm lint` | ✅ exit 0 |
| `pnpm test:run` | ✅ 32 files / 242 tests (was 23 / 160) |
| `pnpm test:e2e` | ✅ 75 passed (was 52) |
| `pnpm test:schematics` | ✅ 36 tests / 10 files (was 28 / 8) |

**What shipped** — Vehicle [T1], Invoice [T2], Payment [T2], each with mock domain (24-row fixture, factory, mock-infra spec), the four feature layers, four routes, sidebar entry, overview card, two section tests, and an e2e spec with an axe scan. Every tier quirk implemented and tested: Invoice's supplier combobox (numeric relation key, async existence refinement, server-side check via a new `supplierExists`), embedded `billing` fieldset, inline Paid switch, USD currency; Payment's both-sides conditional `processedAt`, enum Select in the form, URL-driven `?method` filter applied by the endpoint.

**Plan phase** (`plans/batch-3.md`) resolved the schematic question both prior plans deferred to this batch. The scout's quantification showed create/edit pages are byte-identical across all 7 existing modules with 8 repeats ahead, so I extracted `crud-create-page` and `crud-edit-page`, proved them by running them standalone against Vehicle and diffing against the Coupons references, then extended the `crud-module` composite to compose them. The list/detail pages got the opposite verdict — decided *no*, with evidence, rather than deferred again, since generating their bodies would need the field-list DSL the directive forbids.

**Two things I fixed at VERIFY, both mine to own:**
- The Invoice e2e Paid-switch case asserted `toHaveURL(/\/invoices$/)`, which could never match — TanStack Router writes the list route's search defaults into the URL. Replaced with a before/after URL comparison, which states the actual "must not lose page/search state" requirement more strictly.
- Payment's method Select emitted a React uncontrolled→controlled warning (visible in the e2e console, not a gate failure). Fixed with `value={field.value ?? ''}`, mirroring the existing `?? false` idiom for booleans.

One judgement call worth flagging: for Invoice's relation I kept Review's free-typing behaviour with numeric coercion at the combobox boundary, rather than restricting the field to selection-only. That keeps the declared rule intact and makes the "unknown id fails validation" path reachable and testable through the UI — but it does mean typing digits into a search box that searches supplier *names* sets the id. If you'd prefer selection-only, that's a one-component change to `supplier-combobox.tsx` plus its two tests.
