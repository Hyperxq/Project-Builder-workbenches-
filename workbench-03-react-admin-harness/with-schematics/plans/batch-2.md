# Batch 2 — Supplier [T1], Coupon [T2], Warehouse [T2]

Orchestration plan per `HARNESS.md`. Authority on architecture: `AGENTS.md`.
Design language: `DESIGN.md` (already mapped to semantic tokens in
`src/index.css` — no new colors). Schematic lifecycle governed by
`plan-directives/schematics.md`.

Baseline verified before planning, all four gates green with `authors`,
`books`, `categories`, `reviews` in the tree:

| Gate | Result |
|---|---|
| `pnpm typecheck` | pass |
| `pnpm lint` | pass |
| `pnpm test:run` | 73 tests / 12 files |
| `pnpm test:e2e` | 29 tests |
| `pnpm test:schematics` (extra) | 20 tests / 5 files |

---

## 1. Modules

### 1.1 Supplier (suppliers) — [T1] vanilla, **number key** (`supplierId`)

| Field | Type | Rules |
|---|---|---|
| `supplierId` | number | required, unique, lookup key |
| `name` | string | required |
| `email` | string | required, **unique** (409 on duplicate create) |
| `phone` | string | optional |

Files:

```
mocks/fixtures/suppliers.fixture.ts               22 rows
mocks/domains/suppliers.mock.ts                   supplierHandlers() + resetSuppliers()
mocks/domains/suppliers.mock.spec.ts
mocks/core/types.ts | handlers.ts | setup-test-mocking.ts   registration  (schematic)
src/features/suppliers/domain/supplier.ts
src/features/suppliers/infrastructure/suppliers.api.ts                    (schematic)
src/features/suppliers/application/use-suppliers.ts                       (schematic)
src/features/suppliers/presentation/suppliers-page.tsx
src/features/suppliers/presentation/supplier-form.tsx
src/features/suppliers/presentation/supplier-detail-page.tsx
src/features/suppliers/presentation/supplier-create-page.tsx              (schematic ★new)
src/features/suppliers/presentation/supplier-edit-page.tsx                (schematic ★new)
src/features/suppliers/presentation/suppliers-page.test.tsx
src/features/suppliers/presentation/supplier-form.test.tsx
src/routes/suppliers/index.tsx | new.tsx | $supplierId/index.tsx | $supplierId/edit.tsx  (schematic)
src/app/shell/app-sidebar.tsx                     +1 NAV line             (schematic)
src/routes/index.tsx                              +1 overview card        (schematic)
e2e/suppliers.spec.ts
```

Decisions I own:

- **Supplier has no boolean field** — the first module in the tree without
  one (scout §1). That removes, deliberately: the `<entity>UpsertSchema`
  `.extend({ flag: z.boolean().optional() })` delta, the form `Switch`
  + `Controller`, the Status column, the badge component, and the mock
  spec's "default applied on create" case. `supplierUpsertSchema` is
  therefore an alias of `supplierSchema` (kept exported so the layer
  contract — and the generated data layer's `SupplierUpsert` import —
  stays uniform across modules).
- `email` is `z.email('Must be a valid email')`, the Author rule
  (`author.ts:15`). Uniqueness is enforced **by the mock**, exactly as
  Authors does it (`emailTaken(email, exceptId)`): 409 on create with a
  taken email, 409 on update unless it is the row's own address.
  This is the second and second-to-last instance of a non-key unique
  field in the whole schedule (Employee is the last) — content, not a
  schematic.
- `phone` is the optional text field: `z.string().trim().min(1).optional()`
  with the `setValueAs` empty-string→`undefined` mapping on the input, and
  `—` in the list/detail when absent.
- `supplierId` is `disabled` on edit (the key-field rule) and uses
  `register(..., { valueAsNumber: true })` with `type="number"`.
- Mock `q` searches `name` + `email` + `phone`.
- List columns: ID · Name · Email · Phone · actions.

### 1.2 Coupon (coupons) — [T2] quirks, **string key** (`code`)

| Field | Type | Rules |
|---|---|---|
| `code` | string | required, unique, lookup key |
| `discount` | number | required, int, 1..100 (percent) |
| `expiresAt` | date | required (`YYYY-MM-DD`) |
| `active` | boolean | required, default `true` |

Extra files beyond the drill:

```
src/features/coupons/presentation/coupon-status-badge.tsx   quirk (b)
src/features/coupons/presentation/coupons-page.test.tsx     incl. quirks (b) and (c)
src/features/coupons/presentation/coupon-form.test.tsx      incl. quirk (a)
```

**Quirk (a) — CROSS-FIELD, create-only.** The domain exports two resolvers:

```ts
export const couponUpsertSchema = couponSchema.extend({ active: z.boolean().optional() })
export const couponCreateSchema = couponUpsertSchema.refine(
  (values) => values.expiresAt > todayIso(),
  { path: ['expiresAt'], message: 'Expiry date must be in the future' },
)
```

`CouponForm` picks the resolver by mode — `zodResolver(coupon ? couponUpsertSchema : couponCreateSchema)` — so editing an
already-expired coupon saves cleanly while creating one fails **on the
`expiresAt` field** (`role="alert"` under the input), never as a toast and
never navigating. This is the first mode-dependent schema in the tree and,
per the scout, the only one in the entire schedule.

`todayIso()` lives in the domain and formats the **local** date
(`getFullYear`/`getMonth`/`getDate`, zero-padded) rather than
`toISOString()`, which would be a day off either side of midnight in a
non-UTC zone. `YYYY-MM-DD` strings compare correctly with `<`/`>`.

Boundary I own: `expiresAt === today` is **not yet expired** (the coupon
runs to the end of the day) but is **not a valid create** either (the rule
is "a future date"). Both readings of the spec hold; the asymmetry is
deliberate and asserted at both tiers.

Defence in depth, mirroring Batch 1's relation rule: the **mock** also
rejects a create whose `expiresAt` is not strictly future with 400, while
`PATCH` deliberately does not apply that check.

**Quirk (b) — derived Status column.** A pure domain function, so the list,
the detail page and the mock endpoint all agree:

```ts
export type CouponStatus = 'expired' | 'active' | 'disabled'
export function couponStatus(coupon: Pick<Coupon, 'expiresAt' | 'active'>, today = todayIso()): CouponStatus
```

Expired wins over the flag (a disabled coupon with a past date reads
"Expired"). `CouponStatusBadge` renders the three states with the existing
outline-pill + dot shape: Active → `bg-success`, Disabled →
`bg-muted-foreground`, Expired → `bg-destructive`. No new colors.

**Quirk (c) — status filter.** `?status=active|expired` in the route's
`validateSearch`, **absent when "All"** — `z.enum(['active', 'expired']).optional().catch(undefined)`, mirroring Review's
`verified` exactly (clean URLs, and `toQueryString` already skips
`undefined`). The toolbar control is the shadcn `Select` (first use of
`src/components/ui/select.tsx`) labelled "Status" with All | Active |
Expired; picking "All" navigates with `status: undefined`. Every change
resets to `page: 1`. The filter is applied **by the list endpoint** using
the same `couponStatus()` function, never by the client.

Mock `q` searches `code` (the only string field). List columns: Code ·
Discount (`45%`) · Expires · Status · actions.

Fixture composition is fixed so filter counts cannot rot with the calendar
— 22 rows: **6 expired** (dates in 2019–2024, mixed `active` flag),
**12 active** (dates in 2030+ with `active: true`), **4 disabled**
(dates in 2030+ with `active: false`). So `?status=active` → 12,
`?status=expired` → 6, unfiltered → 22.

### 1.3 Warehouse (warehouses) — [T2] quirks, **string key** (`code`)

| Field | Type | Rules |
|---|---|---|
| `code` | string | required, unique, lookup key |
| `name` | string | required |
| `capacity` | number | required, int, min 0 |
| `location` | embedded | required |
| `location.street` | string | required |
| `location.city` | string | required |
| `location.latitude` | number | required, −90..90 |
| `location.longitude` | number | required, −180..180 |

**Quirk (a) — EMBEDDED.** The domain nests a real `z.object()` with its own
per-field messages, so `errors.location?.latitude?.message` is a distinct
string from `errors.location?.longitude?.message`. The form renders the
group as a `<FieldSet>` + `<FieldLegend variant="label">Location</FieldLegend>`
(first use of `src/components/ui/field.tsx`, which renders a real
`<fieldset>`/`<legend>` — the accessible grouping the spec asks for), with
the four controls inside using the same `Label` + `Input` + `role="alert"`
paragraph shape as every other form in the tree. Inputs register as
`location.street` … `location.longitude`; the two coordinates use
`valueAsNumber`.

Warehouse, like Supplier, **has no boolean** — no badge, no `Switch`, and
`warehouseUpsertSchema` is an alias of `warehouseSchema`.

**Quirk (b) — City column.** `location.city` in the list. Mock `q` searches
`code` + `name` + `location.city`.

PATCH semantics I own: `location` is stored inline and **replaced whole**
on update (`{ ...existing, ...body }`), then the merged entity is
re-validated — a partial `location` in a PATCH body is a 400, not a deep
merge. The form always submits the complete object, so this is invisible to
the UI and keeps the mock honest.

List columns: Code · Name · Capacity · City · actions. 22 fixture rows.

---

## 2. Pattern inventory (scout report, incorporated)

Repetition counts span Batch 2 **and** the remaining schedule (11 unbuilt
entities after Batch 1).

| # | Pattern | Status | Evidence | Repeats ahead | Deviations in Batch 2 |
|---|---|---|---|---|---|
| 1 | Mock domain drill (fixture + factory + spec) | **exists** ×4 | `mocks/domains/{authors,books,categories,reviews}.mock.ts` | 11 | Supplier: `emailTaken` (2nd instance ever). Coupon: date-derived status filter + create-only future check. Warehouse: nested-field validation |
| 2 | Registration edits (route keys, handlers, reset, sidebar, overview card) | **exists**, schematic-covered | `schematics/{mock-domain-register,sidebar-nav-entry,overview-card}` | 11 | none — all three entities fit the inputs exactly |
| 3 | Route files (4 thin files) | **exists**, schematic-covered | `schematics/crud-routes`, `src/routes/**` | 11 | Supplier `keyType=number`; Coupon uses the `extraSearch` variation point (2nd exercise after Review); Warehouse plain string key |
| 4 | Entity data layer (api + hooks) | **exists**, schematic-covered | `schematics/entity-data-layer` | 11 | Coupon uses `listParamsType=CouponListParams` (2nd exercise after `ReviewListParams`) |
| 5 | **Create page + edit page shells** | **exists** ×4, NOT yet extracted | `src/features/*/presentation/*-{create,edit}-page.tsx` | 11 entities × 2 = **22 files** | none — field-independent; see §3 |
| 6 | List page / form / detail page | shape exists ×4, content field-driven | `books-page.tsx`, `reviews-page.tsx`, … | 11 | columns/controls per entity + the three quirks |
| 7 | Test suites (mock-infra + section + e2e w/ axe) | **exists** ×4 | `mocks/domains/*.mock.spec.ts`, `src/features/**/*.test.tsx`, `e2e/*.spec.ts` | 11 | Coupon adds status-filter + past-date cases; Warehouse adds nested-error cases |
| 8 | Extra URL-driven list filter (search schema → params type → api → endpoint → toolbar control) | **exists** ×1 | Review `verified` | 4 (Coupon, Payment, Ticket, Event) | Coupon is the first **3-way** control (Select, not Switch) |
| 9 | Non-key unique field (409) | **exists** ×1 | Authors `emailTaken` | 2 (Supplier, Employee) | none |
| 10 | Boolean status badge (2-state) | **exists** ×4, duplicated | `active-badge`, `in-print-badge`, `enabled-badge`, `verified-badge` | ~7, **0 of them in Batch 2** | Batch 2 contributes none: Supplier and Warehouse have no boolean; Coupon's is a 3-state derived shape |
| 11a | Embedded object (schema + form fieldset + nested validation + nested column) | **new** | `field.tsx` generated but unused | 2 (Invoice `billing`, Shipment `destination`) | Warehouse is the first |
| 11b | Create-vs-edit mode-dependent schema | **new** | — | **0** | Coupon only, one-off in the whole spec |
| 11c | Derived (computed, not stored) list column | **new** | — | **0 direct** | Coupon only (Event's badge is stored, Ticket's is an enum label) |
| 11d | Enum `Select` control, currency, row switches, bulk selection, wizard, role gating | **new** | primitives exist, unwired | Batches 3–5 | out of Batch 2 scope except Coupon's filter `Select` |

**Corrections to the Batch 1 plan's carry-forward table** (`plans/batch-1.md:310-323`),
verified line by line against `entities-benchmark.txt`:

- Number-keyed modules remaining was recorded as **5** but the row lists
  six entities. It is **6**: Supplier, Invoice, Payment, Ticket,
  Subscription, Employee (spec lines 57, 114, 150, 162, 191, 208).
  String-keyed remaining (5: Vehicle, Coupon, Warehouse, Shipment, Event)
  is correct.
- "Status badge — ~8 repeats" is roughly right for the 2-state subset
  (7 remain), but Batch 2 supplies **zero** of them; the extraction cannot
  be driven from this batch. See §3.
- The relation-combobox row (1 repeat left, Invoice→Supplier) is correct
  and untouched here; Batch 2 only ships the Supplier *target*.

---

## 3. Schematic decisions

Per `plan-directives/schematics.md`. Rule 1 fires where a proven,
gates-green instance exists **and** this batch plus the remaining schedule
repeat it ≥3 times. Everything already crystallized in Batch 1 is reused
as-is: the scout's fit check confirms all five existing schematics accept
Supplier/Coupon/Warehouse **with no extension** — Coupon merely exercises
the `extraSearch` and `listParamsType` variation points a second time,
which is what they were declared for.

| Pattern | Established? | Action | Rationale (proven instance · repetitions · variation points) |
|---|---|---|---|
| Create page + edit page shells | **yes ×4** (authors, books, categories, reviews — all gates-green) | **extract** → `default:entity-crud-pages` | Batch 1 deferred the whole presentation folder as "field-driven", but a diff of the four instances shows these two files are **not**: they vary only in plural/singular/key/label. 22 files ahead. Variation points: `plural`, `singular`, `keyName`, `keyType` (decides `params: { k }` vs `params: { k: String(k) }`), `labelField` (optional — present ⇒ `Category "…name" created` / `Edit …name`; absent ⇒ `Review #<key> created` / `Edit review #<key>`, the Review shape) |
| Mock-domain registration | yes | **reuse** `default:mock-domain-register` | Fits all three, zero deviation |
| Sidebar NAV entry | yes | **reuse** `default:sidebar-nav-entry` | Fits all three |
| Overview card | yes | **reuse** `default:overview-card` | Fits all three |
| CRUD route files | yes | **reuse** `default:crud-routes` | Supplier `keyType=number`; Coupon `extraSearch`; Warehouse `keyType=string` |
| Entity data layer | yes | **reuse** `default:entity-data-layer` | Coupon `listParamsType=CouponListParams` |
| Domain schema / fixture / mock factory | shape yes, content no | **defer** (again) | Still the entity's field list. Batch 2 adds three new field kinds (embedded object, derived status, mode-dependent rule); the matrix is still growing. Re-evaluate at the Batch 4 plan |
| List page / form / detail page | shape yes, content no | **defer** (again) | Columns, controls and detail rows are field-driven, and T2/T3 quirks diverge further each batch (bulk bars, wizards, role gates ahead) |
| Shared 2-state status badge primitive | 4 near-identical copies | **defer to Batch 3** | Rule 1 needs repetitions *ahead*; Batch 2 adds **none** (no booleans in Supplier/Warehouse, 3-state derived in Coupon). Batch 3 lands three at once (Vehicle `electric`, Invoice `paid`, Payment `confirmed`) — that is the batch where consolidating pays, and per Batch 1's own note the right move is a shared component, not a generator |
| Embedded-object module shape | **new** | **none** (build by hand) — declare the rule | Rule 2: no proven instance. Only 2 repeats ahead (Invoice, Shipment) so it would not clear the bar even once proven; Warehouse's schema/fieldset/mock/nested-column shape is **declared the rule** those two follow. Re-evaluate at the Batch 3 plan |
| URL-driven 3-way filter control | **new** control on a proven thread | **none** (build by hand) — declare the rule | The route + data-layer halves are schematic-covered already. The toolbar `Select` + endpoint predicate is new; Payment and Event repeat the exact shape (Ticket needs a 2-input range). Extraction candidate at the Batch 3 plan once Coupon is green |
| Mode-dependent (create-only) validation | **new** | **none** (build by hand) | Zero repeats in the whole schedule — a schematic would never pay for itself |

**Rules declared now, extractable later** (rule 2): Warehouse's embedded
shape (nested `z.object()` + `FieldSet` group + nested mock validation +
dotted list column) and Coupon's URL-driven `Select` filter are the shapes
Invoice/Shipment and Payment/Event will repeat.

Schematic hygiene, unchanged from Batch 1: `builder execute` is run
standalone, one per shell call, **by me** — never inside a mechanic
delegation — because every one of the six writes to files shared across
modules. `pbuilder-codegen` is re-run after the new `schema.json` and the
`@schema-digest` change is verified. Factory tests are seeded from the LIVE
target files but use a never-scheduled fixture entity (`widgets`/`Boxes`)
so they survive future registrations.

---

## 4. Delegation plan

I own every shared-file write (schematic authoring, `builder execute`,
gates). Mechanics own disjoint, per-entity file sets and make no design
decisions — the ones above are all mine and are restated in each prompt.

| Unit | Owner | Scope | Depends on |
|---|---|---|---|
| **U0** | me | Baseline gates; `builder new schematic entity-crud-pages` | — |
| **U1** | mechanic A | Implement `entity-crud-pages`: `schema.json` (5 inputs, description filled in), `factory.ts`, `factory.test.ts`. Output must be byte-identical in shape to the four proven instances; tests cover both `labelField` modes, both key types, and idempotence | U0 |
| **U2** | me | Review U1 against §3; `pbuilder-codegen`; `pnpm test:schematics`; then `builder execute` × 6 schematics × 3 entities (18 standalone runs); regenerate `src/routeTree.gen.ts`; verify every generated file against its Authors/Reviews counterpart | U1 |
| **U3** | mechanic B | **Supplier module**: fixture, mock factory + spec, domain schema, list/form/detail pages, section tests, `e2e/suppliers.spec.ts` | U2 |
| **U4** | mechanic C | **Coupon module**: fixture, mock factory + spec (status filter + create-only future rule), domain (incl. `todayIso`, `couponStatus`, `CouponListParams`, `couponCreateSchema`), `CouponStatusBadge`, list/form/detail pages, section tests, `e2e/coupons.spec.ts` | U2 |
| **U5** | mechanic D | **Warehouse module**: fixture, mock factory + spec (nested validation), domain (nested `z.object()`), list/form (FieldSet group)/detail pages, section tests, `e2e/warehouses.spec.ts` | U2 |
| **U6** | me | Full four-gate run + `pnpm test:schematics`; diagnosis; mechanical fixes delegated back to the owning mechanic | U3, U4, U5 |

U3/U4/U5 run **in parallel** — their file sets are disjoint (`suppliers` vs
`coupons` vs `warehouses` under `mocks/`, `src/features/`, `e2e/`) and every
shared file they touch was written in U2.

**Shared-tree hazard, called out in every wave-2 prompt.** `src/routeTree.gen.ts`
imports *all* route files, and U2 generates routes for all three entities
before any presentation file exists. Until a module's five presentation
files exist, `renderApp()` fails for **every** module, not just that one.
Each mechanic is therefore instructed to (1) create its presentation files
as its first action, (2) run `pnpm vitest run mocks/domains/<plural>.mock.spec.ts`
(independent of the route tree) while iterating on the mock tier, and
(3) treat a section-test failure that names a *sibling* module as "not
mine" — re-run rather than edit another module's files. I run the
suite-wide gates in U6 once all three have landed.

Each delegation prompt carries: the exact file list, the reference file to
mirror, the entity's spec lines from `entities-benchmark.txt`, the design
decisions from §1, and the tests required.

---

## 5. Verification plan

Per module, before I call it done:

1. **Mock tier** — `mocks/domains/<plural>.mock.spec.ts`: default page size
   10 and `total` = fixture length; last page holds the remainder; `q`
   filters across the declared string fields; `GET` 200 + 404; `POST` 201,
   400 invalid, 409 duplicate key; `PATCH` partial merge; `DELETE` 204 then
   404; state reseeds between tests. Plus per entity:
   - Supplier: 409 on a duplicate **email** at create; PATCH to a taken
     email 409; PATCH keeping its own email 200.
   - Coupon: `?status=active` → 12, `?status=expired` → 6, unfiltered → 22;
     `POST` with a past date → 400 and with today's date → 400; `PATCH`
     keeping a past date → 200; `POST` defaults `active` to `true`;
     `discount` 0 or 101 → 400.
   - Warehouse: missing `location` → 400; missing `location.city` → 400;
     `latitude` 91 / `longitude` −181 → 400; `q` matches `location.city`;
     PATCH replaces `location` wholesale.
2. **Section tier** — list: renders page 1 from the API, searches,
   paginates, deletes through the row menu with confirmation. Form:
   validation errors on empty submit without navigating, successful create
   returning to the list, server 409 surfaced in the form. Plus:
   - Supplier: duplicate-email 409 surfaced in the form (distinct from the
     duplicate-id case).
   - Coupon: the Status column reads "Expired"/"Active"/"Disabled" from the
     derived rule; the Status `Select` writes `?status=expired` to the URL
     and narrows the list, and "All" clears the param; creating with a past
     date shows a field error under **Expires at**, stays on `/coupons/new`
     and fires no toast; editing an already-expired coupon saves.
   - Warehouse: empty submit reports the nested messages ("Street is
     required", "City is required") from inside the Location fieldset; an
     out-of-range latitude reports on `location.latitude` only; the list
     shows the city; create round-trips the whole embedded object.
3. **E2E tier** — `e2e/<plural>.spec.ts`: list + pagination, search, create,
   detail + edit, delete with confirmation, duplicate-key server error, and
   an axe scan of the list and form pages asserting zero serious/critical
   violations. Coupon adds a status-filter pass; Warehouse adds a nested
   create + city-column pass.
4. **Schematics** — `pnpm test:schematics` green, `entity-crud-pages`
   asserted idempotent and correct in both label modes and both key types;
   generated files diffed against their proven counterparts before wave 2
   starts.
5. **Batch gates** — `pnpm typecheck && pnpm lint && pnpm test:run &&
   pnpm test:e2e`, run by me, all four green. Batch 1's 73 unit tests and
   29 e2e tests must still pass unchanged.

---

## 6. Outcome

All four gates green, chained in one run (exit 0):

| Gate | Before | After |
|---|---|---|
| `pnpm typecheck` | pass | pass |
| `pnpm lint` | pass | pass |
| `pnpm test:run` | 73 tests / 12 files | **143 tests / 21 files** |
| `pnpm test:e2e` | 29 tests | **52 tests** |
| `pnpm test:schematics` | 20 tests / 5 files | **26 tests / 6 files** |

New coverage: Supplier 13 mock + 8 section + 8 e2e; Coupon 15 mock + 11 section
+ 8 e2e; Warehouse 14 mock + 9 section + 7 e2e. Batch 1's 73 unit and 29 e2e
tests still pass unchanged.

Delivered: **Supplier [T1]** (number key, second unique field), **Coupon [T2]**
with all three quirks — the create-only future-date rule as a field error that
edit deliberately does not apply, the derived three-state Status column, and
the URL-driven `?status=` filter applied by the list endpoint — and
**Warehouse [T2]** with the embedded `location` object rendered as a real
`<fieldset>` with per-nested-field validation and a `location.city` list
column.

One schematic extracted — `default:entity-crud-pages` — closing the gap Batch 1
left when it deferred the whole presentation folder as "field-driven". Its
factory tests assert the output is **byte-for-byte identical** to all four
proven instances (`authors`, `books`, `categories`, `reviews`), which is the
strongest possible evidence that the two files really are field-independent.
Six schematics were then run 18 times (3 entities × 6), each standalone, and
both of Batch 1's declared variation points fired again on Coupon
(`extraSearch` → `?status=`, `listParamsType` → `CouponListParams`).

Defects found in review and fixed:

- Coupon's Status `Select` handed `onValueChange` a bare `string`, which does
  not satisfy the route's `'active' | 'expired' | undefined` search contract —
  a typecheck failure the mechanics could not have seen (they were instructed
  not to run the build while three modules were in flight). Fixed with a
  `toStatusFilter()` narrowing helper rather than a cast, so the URL contract
  stays type-enforced.
- Three locator bugs in `e2e/warehouses.spec.ts`, all the non-exact-matcher
  class that also bit Batch 1: `getByLabel('City')` substring-matches
  **Capa-city**, and `getByText('Amsterdam')` matched the heading, the Name cell
  and the City cell. Fixed with exact matchers, and the rest of the file
  audited for the same class.
- Supplier's e2e proved the 409 on a duplicate **email** but not on the
  duplicate **lookup key**, which §5.3 requires of every module; added.
- A **pre-existing Batch 1 flake** surfaced by the larger suite:
  `review-form.test.tsx` asserts `25 reviews` after a create, which has to wait
  on a navigation *and* a refetch — over Testing Library's 1s default once 21
  test files contend for CPU. Fixed once for the whole suite in
  `src/test/setup.ts` (`configure({ asyncUtilTimeout: 5000 })`) instead of
  patching the one assertion; a longer ceiling never weakens an assertion.
  Verified with three consecutive full-suite runs.

Notes for the record:

- Radix `Select` drove cleanly under jsdom/user-event on the first attempt —
  the pointer-capture polyfills already in `src/test/setup.ts` are sufficient.
  No fallback control was needed.
- `mocks/domains/coupons.mock.ts` imports `couponStatus`/`todayIso` as
  **runtime** functions from the domain layer (previous mocks imported types
  only). That is the inward direction and it is what keeps the endpoint filter
  and the UI badge from drifting apart; it is now the precedent for derived
  server-side filters.

### Carried into the Batch 3 plan (Vehicle [T1], Invoice [T2], Payment [T2])

| Shape | Proven by | Repeats left | Note for extraction |
|---|---|---|---|
| Create/edit page shells | `entity-crud-pages`, now generated for 3 more entities | 8 entities | Extracted. Nothing to do but run it |
| 2-state boolean status badge | 4 copies (Batch 1) | 7, and **3 land in Batch 3** (Vehicle `electric`, Invoice `paid`, Payment `confirmed`) | This is the batch where consolidation pays. Build a shared component (not a schematic — the variation is two label strings) and migrate the 4 existing copies |
| URL-driven single-select list filter | Coupon `status` (toolbar `Select` + endpoint predicate) | 2 (Payment `method`, Event `status`) + Ticket's 2-input date range | Route/data-layer halves are already schematic inputs. A shared `<ListFilterSelect>` component is the right unit; at 2 repeats it is a component, not a generator |
| Embedded object (nested schema + `FieldSet` group + nested mock validation + dotted column) | Warehouse `location` | 2 (Invoice `billing`, Shipment `destination`) | Rule declared in §1.3 — Invoice follows it verbatim in Batch 3. Below the ≥3 bar, so still no schematic |
| Non-key unique field (409) | Authors, Supplier | 1 (Employee) | Content; never a schematic |
| Relation combobox | Review → Book | 1 (Invoice → Supplier) — **its target now exists** | Extend the existing `BookCombobox` shape by hand; one repeat does not justify extraction |
| Currency rendering (USD, 2dp) | — **new** | 2, both in Batch 3 (Invoice `total`, Payment `amount`) | Rule 2: build once by hand as a shared formatter, declare it the rule |
| Inline row action mutating a row (switch / menu item + toast, preserving page/search state) | — **new** | 3 (Invoice `paid` switch, Ticket Close/Reopen, Subscription Renew) | First instance is Invoice in Batch 3; extraction candidate at the Batch 4 plan |
| Conditional required field (X required when flag is true) | — **new** | 2 (Payment `processedAt`, Shipment `shippedAt`) | Distinct from Coupon's rule: same schema in both modes, so a `superRefine` on the shared upsert schema, not a second schema |
| Enum field as a form `Select` | — **new** (Coupon proved `Select` as a *filter*, not as a field) | 4 (Payment `method`, Ticket `priority`, Subscription `plan`, plus Event) | First field-level use is Payment in Batch 3 |

Key-type ledger after this batch: **3 string-keyed** (Vehicle, Shipment, Event)
and **5 number-keyed** (Invoice, Payment, Ticket, Subscription, Employee)
entities remain — correcting the miscount recorded in the Batch 1 plan (§2).
