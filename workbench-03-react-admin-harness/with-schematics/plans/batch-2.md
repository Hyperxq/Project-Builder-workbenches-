# Batch 2 — Supplier [T1], Coupon [T2], Warehouse [T2]

Orchestrated per `HARNESS.md`. Authority on architecture: `AGENTS.md`. Design
language: `DESIGN.md`. Plan directives incorporated:
`plan-directives/schematics.md` (decisions recorded under **Schematic
decisions**).

Baseline measured before planning (Authors + batch-1 modules):
`pnpm typecheck` ✅ exit 0 · `pnpm lint` ✅ exit 0 · `pnpm test:run` ✅ 14 files /
88 tests · `pnpm test:e2e` ✅ 29 passed (batch-1 close-out). Every gate is green
today, so any red during this batch is ours.

---

## 1. Modules

### 1.1 Supplier [T1] — `suppliers`, key `supplierId: number`

| Field | Type / rules |
|---|---|
| `supplierId` | number, required, **unique** (lookup key) |
| `name` | string, required |
| `email` | string, required, **unique** (second unique field → 409) |
| `phone` | string, optional (`'' → undefined`) |

Files:

```
mocks/fixtures/suppliers.fixture.ts          24 rows (3 real pages)
mocks/domains/suppliers.mock.ts              supplierHandlers() + resetSuppliers()
mocks/domains/suppliers.mock.spec.ts
mocks/core/types.ts                          + 5 route keys                [generated edit]
mocks/handlers.ts                            + import/spread               [generated edit]
mocks/setup-test-mocking.ts                  + resetSuppliers()            [generated edit]
src/features/suppliers/domain/supplier.ts    supplierSchema, supplierUpsertSchema, supplierKey()
src/features/suppliers/infrastructure/suppliers.api.ts                     [generated]
src/features/suppliers/application/use-suppliers.ts                        [generated]
src/features/suppliers/presentation/suppliers-page.tsx
src/features/suppliers/presentation/supplier-form.tsx
src/features/suppliers/presentation/supplier-create-page.tsx
src/features/suppliers/presentation/supplier-edit-page.tsx
src/features/suppliers/presentation/supplier-detail-page.tsx
src/features/suppliers/presentation/suppliers-page.test.tsx
src/features/suppliers/presentation/supplier-form.test.tsx
src/routes/suppliers/index.tsx  new.tsx  $supplierId/index.tsx  $supplierId/edit.tsx  [generated]
src/app/shell/app-sidebar.tsx                + NAV line (icon `Truck`)     [generated edit]
src/routes/index.tsx                         + overview card               [generated edit]
e2e/suppliers.spec.ts
```

Reference to mirror: **Authors** (the closest repeat in the whole schedule —
`supplierId`→`authorId`, `name`→`fullName`, `email`→`email`, `phone`→`country`).
List columns: ID · Name · Email · Phone (`—` when unset) · row actions.
Sort by `supplierId` ascending; `q` searches `name | email | phone`.

### 1.2 Coupon [T2] — `coupons`, key `code: string`

| Field | Type / rules |
|---|---|
| `code` | string, required, **unique** (lookup key) |
| `discount` | number, required, integer 1..100 (percent) |
| `expiresAt` | date (`YYYY-MM-DD`), required |
| `active` | boolean, required, default `true` |

Same file set as Supplier with `coupon`/`coupons`, key param `$code`, plus
`presentation/coupon-status-badge.tsx`. Sidebar/overview icon `TicketPercent`.
List columns: Code · Discount (`25%`) · Expires (`YYYY-MM-DD`) · Status ·
row actions. Sort by `code` ascending; `q` searches `code`.

Quirk decisions (mine — the mechanic implements, never decides):

- **(a) CROSS-FIELD, CREATE ONLY.** The domain exports two schemas:
  `couponUpsertSchema` (the plain shape, used by the edit form and by
  `couponsApi`) and `couponCreateSchema = couponUpsertSchema.superRefine(…)`
  which adds the future-date rule with `path: ['expiresAt']` and message
  `Expiry must be a future date`, so RHF renders it as the **field error**
  under the Expires input — never a toast — and submission does not proceed.
  `CouponForm` selects the resolver schema from the prop it already has:
  `const schema = coupon ? couponUpsertSchema : couponCreateSchema` (a form
  instance is a create form or an edit form for its whole life — the edit page
  mounts the form only after the coupon has loaded), so **no new prop** and no
  "mode" flag is introduced. "Future" means strictly after today:
  `expiresAt > todayIso()`.
  Server side, the mock enforces the same rule in the **POST handler only**
  (400 `expiresAt must be a future date`), as a second line of defence, exactly
  like the reviews relation check. It is deliberately NOT in the shared
  `validateUpsert`, because PATCH re-validates the merged body and editing an
  already-expired coupon must stay legal (spec: "edit may keep a past date").
- **(b) DERIVED STATUS COLUMN.** `couponStatus(coupon, today = todayIso())`
  lives in the **domain** (it is a rule about the entity, not about pixels) and
  returns `'expired' | 'active' | 'disabled'`: expired when
  `expiresAt < today` (a coupon expiring *today* is not yet expired), else
  `active ? 'active' : 'disabled'`. `CouponStatusBadge` renders it with the
  established `InPrintBadge` dot idiom — `Badge variant="outline"` plus a
  status dot (`bg-destructive` expired, `bg-success` active,
  `bg-muted-foreground` disabled) and the labels `Expired` / `Active` /
  `Disabled`. Used by both the list column and the detail page.
- **(c) STATUS FILTER.** `status: z.enum(['all','active','expired']).default('all').catch('all')`
  in the list route's `validateSearch` (via the `crud-routes`/`crud-module`
  `extraSearch` input — the variation point batch 1 built, unchanged). The page
  forwards `filters: { status: status === 'all' ? undefined : status }`, so
  `?status=all` never reaches the wire (`toQueryString` drops `undefined`), and
  the **list endpoint** applies it before pagination so `total` reflects the
  filtered set — the exact flow Review's `?verified` proved. Control: the
  shadcn `Select` (first wiring of `src/components/ui/select.tsx`, which no
  feature imports today) with `aria-label="Filter by status"`. Changing the
  filter resets `page` to 1 and preserves `q`, mirroring the verified toggle.
  Contingency (mine, pre-authorised): the jsdom polyfills Radix Select needs
  (`hasPointerCapture`, `setPointerCapture`, `releasePointerCapture`,
  `scrollIntoView`) already exist in `src/test/setup.ts:25-28`, so the section
  test drives the real Select; if it still proves undrivable in jsdom, the
  section test asserts the filter by rendering `/coupons?status=expired`
  directly (URL → endpoint is what the quirk specifies) and the e2e spec keeps
  the click-through coverage. No test-setup change is authorised.

Fixture determinism: statuses must not drift as real time passes, so the 24
rows use **fixed far-past and far-future dates** — 8 expired (`2023-…`),
12 active (`2099-…`, `active: true`), 4 disabled (`2099-…`, `active: false`).
Tests assert those counts.

### 1.3 Warehouse [T2] — `warehouses`, key `code: string`

| Field | Type / rules |
|---|---|
| `code` | string, required, **unique** (lookup key) |
| `name` | string, required |
| `capacity` | number, required, integer min 0 |
| `location` | **embedded**, required |
| `location.street` | string, required |
| `location.city` | string, required |
| `location.latitude` | number, required, -90..90 |
| `location.longitude` | number, required, -180..180 |

Same file set as Supplier with `warehouse`/`warehouses`, key param `$code`,
no extra presentation component. Sidebar/overview icon `Warehouse`.
List columns: Code · Name · Capacity · City (`location.city`) · row actions.
Sort by `code` ascending; `q` searches `code | name | location.city`.

Quirk decisions (mine):

- **(a) EMBEDDED.** `locationSchema = z.object({ street, city, latitude, longitude })`
  nested as `location: locationSchema` inside `warehouseSchema` — the first
  nested Zod object in the tree. The form renders it as a grouped
  `FieldSet` + `FieldLegend` ("Location") from `src/components/ui/field.tsx`
  (generated, imported by no feature today). **Inside** the fieldset the
  established per-field idiom is kept unchanged — `space-y-2` + `Label` +
  `Input` + `<p role="alert" className="text-xs text-destructive">` — with
  nested RHF names (`register('location.street')`,
  `register('location.latitude', { valueAsNumber: true })`) and nested error
  reads (`errors.location?.city`). Rationale: one form idiom in the codebase;
  the fieldset supplies the *grouping*, not a second field system. Latitude and
  longitude follow the established single-message convention for bounded
  numbers (`review.ts:19-27`), so a blank input reads
  `Latitude must be between -90 and 90` instead of "received NaN".
  Mock: `validateUpsert` walks into `body.location` and returns a per-nested-field
  message; entity construction nests the trimmed object.
- **(b) CITY COLUMN.** Plain dotted read `warehouse.location.city` in the list
  and in the detail page's Location group.

### 1.4 Shared changes (mine, cross-cutting — decided here, built once)

1. **`src/shared/domain/iso-date.ts`** — add `todayIso()` returning
   `new Date().toISOString().slice(0, 10)` (UTC, documented). One definition
   used by both the UI (`couponStatus` default arg) and the coupons mock, so
   client and server can never disagree about "today". Tests and fixtures stay
   far from the boundary (±years), so the UTC/local edge is untestable-by-design
   rather than flaky.
2. **`mocks/core/list-query.ts`** — `parseListQuery(url)` →
   `{ page, pageSize, q }` and `paginate<T>(items, page, pageSize)` →
   `Paginated<T>`, lifted verbatim from the four proven domains, and the four
   existing domains (`authors`, `books`, `categories`, `reviews`) retrofitted
   onto it in the same unit of work. Rationale under **Schematic decisions**:
   this is the one *byte-identical* sub-shape of the mock factory, repeated 11
   more times in the schedule; de-duplicating it beats generating it, and
   retrofitting now prevents a half-migrated tree in which the next mechanic
   mirrors the old copy-pasted `parsePage`. Reviews keeps its own one-line
   `verified` read on top of `parseListQuery`; behaviour is unchanged and the
   four existing mock specs are the regression net.

No other shared file changes. `ListParams.filters` (batch 1, §1.4.1) already
carries Coupon's `status` with no modification.

---

## 2. Pattern inventory (scout report, incorporated)

Read-only sweep by the `scout` sub-agent over `AGENTS.md`,
`entities-benchmark.txt`, `plans/batch-1.md`, the four mock domains + fixtures +
specs, `mocks/core/*`, the shared api/domain modules, all four feature stacks,
`src/components/ui/field.tsx`, `DESIGN.md`, and all eight schematics.

### 2.1 Per module — exists vs new

Batch 1 established all 17 atomic shapes of the AGENTS.md module drill, and
every one is green. **No batch-2 artefact type lacks a precedent**; what is new
is confined to specific mechanisms inside a few of those shapes.

| Atomic shape | Established by | Proven instance |
|---|---|---|
| mock fixture (≥20 rows) | all 4 | `mocks/fixtures/books.fixture.ts:6-29` (24 rows) |
| mock factory + `reset<X>()` | all 4 | `mocks/domains/books.mock.ts:33-37,65-147` |
| mock-infra spec | all 4 | `mocks/domains/books.mock.spec.ts:1-115` |
| route-key registration | all 4 | `mocks/core/types.ts:14-34` |
| `handlers.ts` spread | all 4 | `mocks/handlers.ts:9-32` |
| `setup-test-mocking` reset | all 4 | `mocks/setup-test-mocking.ts:5-8,34-39` |
| domain Zod schema | all 4 | `src/features/books/domain/book.ts:22-40` |
| infrastructure api | all 4, byte-identical | generated by `crud-api` |
| application hooks | all 4, byte-identical | generated by `crud-hooks` |
| list page | all 4 | `src/features/reviews/presentation/reviews-page.tsx` |
| form | all 4 | `src/features/books/presentation/book-form.tsx` |
| create/edit/detail pages | all 4 | `src/features/books/presentation/book-*-page.tsx` |
| route files (4/entity) | all 4, generated | `crud-routes` |
| sidebar NAV / overview card | all 4, generated | `sidebar-nav-entry`, `overview-card` |
| section tests | all 4 | `books-page.test.tsx`, `book-form.test.tsx` |
| e2e spec | all 4 | `e2e/books.spec.ts` (99 lines) |

**Supplier** — the closest possible repeat of Authors in the entire schedule.
Zero new shapes; the only thing to get right is reusing the proven
second-unique-field logic rather than reinventing it (§2.2.i).

**Coupon** — established shapes hosting three genuinely new mechanisms:
create-only cross-field refinement, a derived/computed column, and a 3-valued
Select URL filter (§2.2.ii–iv).

**Warehouse** — established shapes hosting one new mechanism: the embedded
object, which touches domain, mock, form and list (§2.2.v).

### 2.2 The six unknowns, resolved

**(i) Second unique field (Supplier).** *Established, not new.*
`mocks/domains/authors.mock.ts:56-60` (`emailTaken(email, exceptId)`), used at
`:103` on CREATE **after** the key-uniqueness check at `:102` (key wins when
both collide) and at `:127` on UPDATE with self excluded by id. Supplier reuses
it verbatim with `authorId`→`supplierId`. Repeats once more ahead (Employee,
batch 5).

**(ii) Create-only cross-field rule (Coupon).** *No precedent anywhere.*
`review-form.tsx:33-43` is an async `superRefine` but applies identically on
create and edit; nothing in the tree branches form-schema behaviour on
create-vs-edit. Coupon is the **only** create-only differentiation in the whole
15-entity schedule (Shipment's and Payment's conditionals apply on both sides),
so: 1 occurrence, ever → build it, do not generalise it.

**(iii) Derived/computed column (Coupon).** *No precedent anywhere* — grep for
`new Date()|Date.now|toISOString|today` returns zero hits outside
`entities-benchmark.txt`. `InPrintBadge`/`VerifiedBadge` render a **direct
boolean**, never a comparison of two fields at render time. Event's
Published/Draft badge (batch 4) is a direct boolean read, so this is also a
1-occurrence mechanism.

**(iv) 3-valued Select URL filter (Coupon).** *Plumbing proven, control new.*
The URL→endpoint path is proven end to end for Review's boolean:
`src/routes/reviews/index.tsx:12` → `reviews-page.tsx:47` →
`src/shared/api/pagination.ts:21-29` → `mocks/domains/reviews.mock.ts:37-45,72-74`
(applied before pagination). Coupon reuses that path unchanged. What is new:
`src/components/ui/select.tsx` has **zero imports** in `src/features`/`src/routes`
— the same "generated primitive never wired" state `Command`/`Popover` were in
before Review. Repeats: Payment `method` (batch 3) and Event status (batch 4) →
**3 total, 2 remaining after this batch**. Ticket's `?from`/`?to` date range is
a different shape, not a repeat.

**(v) Embedded object (Warehouse).** *No precedent anywhere* — no domain schema
nests a `z.object`, no form uses dotted RHF names, no mock stores a nested
value. `FieldSet`/`FieldLegend`/`FieldGroup` exist at
`src/components/ui/field.tsx:8-50` but are imported by no feature. Repeats:
Invoice `billing` (batch 3) and Shipment `destination` (batch 4) → **3 total,
2 remaining after this batch**. Warehouse is the first instance and therefore
becomes the declared rule (§3, directive rule 2).

**(vi) Bounded numbers.** *Established.* `book-form.tsx:72`
(`valueAsNumber: true`) against `book.ts:25`, and `review.ts:30` is already a
two-bound `1..5` range using the documented single-message convention
(`review.ts:19-27`). Coupon's `1..100` and Warehouse's `min 0` / `-90..90` /
`-180..180` are direct applications — no new mechanism, and the convention
repeats in ~8 remaining entities.

**(vii) Grouped form sections.** `DESIGN.md` gives no explicit guidance
(only an unrelated hairline-border token at `:295`); `components/ui/field.tsx`
is the only asset. Hence the explicit wiring decision in §1.3(a) rather than a
mechanic-level judgement call.

### 2.3 Repetition — this batch and the remaining schedule

11 entities remain after this batch (Vehicle, Invoice, Payment, Shipment,
Ticket, Event, Subscription, Employee + the 3 built here).

| Mechanism | Batch 2 | Batches 3-5 | Total ahead | First precedent |
|---|---|---|---|---|
| full module skeleton (api/hooks/routes/4 registrations) | 3 | 8 | 11 | `crud-module` — generated |
| mock fixture + factory + spec | 3 | 8 | 11 | Authors (established) |
| second unique field + 409 | 1 | 1 | 2 | `authors.mock.ts:56-60` |
| bounded number field | 4 | ~8 | ~12 | `review.ts:30` |
| list filter param beyond `page/q` | 1 | 4 | 5 | `reviews` `?verified` |
| 3/4-valued Select URL filter | 1 | 2 | 3 | **new here** |
| embedded object | 1 | 2 | 3 | **new here** |
| create-only cross-field rule | 1 | 0 | 1 | **new here, one-off** |
| derived/computed column | 1 | 0 | 1 | **new here, one-off** |

`MockRouteKey` grows 20 → 35 in this batch (75 at the end of the schedule).

### 2.4 Schematic coverage check (scout, verbatim conclusion)

All eight batch-1 schematics were re-read (`schema.json` + `factory.ts` +
`helper.ts`). **None needs extension or a sibling for batch 2**:

- `mock-route-keys`, `mock-domain-register`, `sidebar-nav-entry`,
  `overview-card` — pure additive, idempotent edits; unchanged for all three
  entities.
- `crud-api`, `crud-hooks` — byte-identical output; Coupon's `status` rides the
  existing `ListParams.filters` bag, so the infrastructure layer is untouched.
- `crud-routes` — `extraSearch` (`crud-routes/helper.ts:6-16`) takes raw Zod
  entry lines. Supplier/Warehouse pass `""`; Coupon passes the `status` enum
  line. The variation point absorbs the deviation **as a declared input**, which
  is exactly what directive rule 3 asks for — no post-generation patching.
- `crud-module` — composition order (generate → register,
  `crud-module/factory.ts:24-31`) still holds for all three.

---

## 3. Schematic decisions

Directive: extract from proven code, bottom-up, one schematic per atomic
pattern, composites only from proven pieces, never a master generator.

| Pattern | Established? | Action | Rationale (proven instance · repetitions · variation points) |
|---|---|---|---|
| Module skeleton (api + hooks + routes + 4 registrations) | ✅ proven on Book/Category/Review in batch 1 | **use** `default:crud-module` ×3 | 11 repeats ahead. Coupon's only deviation is the `extraSearch` input value. Nothing generated is hand-patched afterwards. |
| List-route extra search entries | ✅ `extraSearch`, proven on Review | **use as-is** | 5 entities ahead need a filter; Coupon is the second. A raw-Zod-line input already covers boolean, enum and (later) date-range entries — no typing-up of the parameter. |
| Mock domain factory + fixture | ✅ 7 instances after this batch | **defer again** (re-evaluate at batch 3) | Skeleton is invariant, but the body carries `validateUpsert`, the `q` predicate, the uniqueness count (1 vs 2), extra filters, relation checks and — from Warehouse — nested-object validation. Generating that needs a "kind of entity" switch, i.e. the master generator the directive forbids. |
| ↳ its one byte-identical sub-shape: list-query parsing + pagination slice | ✅ 4/4 instances identical (`books.mock.ts:45-51,78-85` and siblings) | **extract as a shared helper, not a schematic** → `mocks/core/list-query.ts`, and retrofit the 4 existing domains | 11 repeats ahead. The directive's bottom-up bias points at this sub-shape, but the right crystallisation for *runtime* code that is textually identical is a shared function: DRY beats generating 11 copies. Retrofitting in the same unit keeps one idiom in the tree, so the next mechanic mirrors the helper, not the copy-paste. |
| Embedded-object fieldset (domain nesting + `FieldSet` group + nested mock validation) | ❌ first instance is Warehouse | **new pattern, built by hand — declared the rule** (directive rule 2) | 2 repeats ahead (Invoice `billing`, Shipment `destination`). Once Warehouse is green it is the reference all embedded objects mirror; extraction is re-evaluated at batch 3 with a second instance in hand. |
| Enum Select list filter | ❌ first instance is Coupon | **new pattern, built by hand — declared the rule** | 2 repeats ahead (Payment, Event). The URL→endpoint plumbing is already proven and shared; only the control is new, and one instance is not enough to extract from. |
| Create-only cross-field refinement | ❌ first and only instance | **none** | 1 occurrence in the whole schedule — extracting would be speculation. |
| Derived status column | ❌ first and only instance | **none** | 1 occurrence in the whole schedule. |
| List page / form / create-edit-detail pages | ✅ 4 instances | **defer** (re-evaluate at batch 3, as batch 1 scheduled) | Batch 2 adds the *first* fieldset and the *first* Select filter — exactly the evidence batch 1 said to wait for, and it arrives at the end of this batch, not the start. Batch 3 (Invoice/Payment: second embedded object, second enum filter, inline row action, currency) is the scheduled decision point. |
| Section tests / e2e specs | ✅ 4 instances | **defer** (permanently, unless proven otherwise) | Assertions are field- and quirk-specific; generated tests would assert nothing entity-true. |
| Domain Zod schema | ✅ 4 instances | **none** | It *is* the per-entity specification. |

Granularity rule applied: no pattern above bundles two unrelated shapes, and no
schematic gains a "kind of entity" switch. The two genuinely new mechanisms
(embedded fieldset, Select filter) are built by hand as first instances and
declared the rule — not invented into schematics ahead of proof.

---

## 4. Delegation plan

Every delegation is a blocking `mechanic` call carrying: exact files, the
reference pattern to mirror, the entity's spec lines from
`entities-benchmark.txt`, and the tests it must include. I review each delivery
against this plan before the next step. Design decisions stay in this file.

| # | Unit | Depends on | Delegate |
|---|---|---|---|
| **W1** | Shared prep: `todayIso()` in `src/shared/domain/iso-date.ts`; `mocks/core/list-query.ts` (`parseListQuery`, `paginate`) + retrofit of the four existing mock domains. Gates stay green with no test changes. | — | mechanic |
| **X1** | I run `builder execute default:crud-module` **standalone, one shell call each** (pbuilder guardrail) for `suppliers`, `coupons`, `warehouses`, then read every file it wrote/edited and diff the shape against the Authors originals. | W1 | me |
| **M1** | Supplier module: fixture (24 rows), mock + spec (incl. `emailTaken` 409 on create and update), domain schema, 6 presentation files, 2 section tests, `e2e/suppliers.spec.ts`. | X1 | mechanic |
| **M2** | Coupon module + all three quirks: create-only future-date field error, derived status helper + badge, Select `?status` filter applied by the endpoint; fixture with the fixed 8/12/4 split; mock with the status filter and the POST-only future check; tests per quirk. | X1 | mechanic |
| **M3** | Warehouse module + both quirks: nested `location` schema, `FieldSet` group with per-nested-field errors, nested mock validation, City column; tests per quirk. | X1 | mechanic |
| **V** | Gates, diagnosis, fixes (mechanical fixes re-delegated). | all | me |

M1, M2 and M3 touch disjoint file sets (their own `src/features/<plural>/**`,
`mocks/{fixtures,domains}/<plural>*`, `e2e/<plural>.spec.ts`) because X1 has
already made every shared edit, so all three run **in parallel in one message**,
each blocking.

---

## 5. Verification plan

Per module, before the batch is called done.

**All three (baseline every module must pass)**
- mock spec: default page of 10 with `total` 24 · last-page remainder · `q`
  narrowing across the declared string fields · `GET` 200 and 404 · `POST` 201
  with the boolean defaulted, 400 invalid, 409 duplicate key · `PATCH` partial
  merge + 404 · `DELETE` 204 then 404.
- section (list): renders page 1 from the API · search narrows · Next
  paginates · row-menu delete removes the row and updates the count.
- section (form): empty submit shows field errors and does not navigate ·
  create succeeds and returns to the list · duplicate key surfaces the server
  409 text without navigating.
- e2e: list + pagination · search · create · detail → edit · delete ·
  duplicate-key conflict · axe scan (no serious/critical) on list and form.

**Supplier (T1)** — plus: duplicate **email** returns 409 on create *and* on
update-of-another-row (mock spec), and the 409 text is surfaced by the form
(section); `phone` empty maps to `undefined` and renders `—`.

**Coupon (T2)** — plus one test per quirk:
- (a) creating with a past `expiresAt` shows the field error under Expires and
  does **not** navigate (section); editing an already-expired fixture coupon and
  saving succeeds (section); the mock rejects a past `expiresAt` on POST with
  400 but accepts it on PATCH (mock spec).
- (b) an expired fixture row renders `Expired`, a disabled future row renders
  `Disabled`, an active future row renders `Active` (section, list).
- (c) `?status=expired` returns only the 8 expired rows and `?status=active`
  only the 12 active ones (mock spec, endpoint-applied `total`); choosing
  "Expired" in the Select writes `?status=expired`, resets `page` to 1 and
  keeps `q` (section, per the §1.2(c) contingency); e2e drives the Select
  click-through.

**Warehouse (T2)** — plus one test per quirk:
- (a) submitting the empty form shows a message under **each** nested field
  (street, city, latitude, longitude) inside the Location fieldset, with the
  group exposed as a `group`/fieldset with the accessible name "Location";
  out-of-range latitude/longitude are field errors; the mock rejects a nested
  violation with 400 (mock spec).
- (b) the list renders the City column from `location.city` and `q` matches on
  it (section + mock spec).

**Batch gates** — run by me, in the foreground, until all green:

```bash
pnpm typecheck && pnpm lint && pnpm test:run && pnpm test:e2e
```

Plus `pnpm test:schematics` (unchanged schematics must stay green after the
three `crud-module` runs).

Expected end state: 7 sidebar entries + 7 overview cards, `MockRouteKey` at 35
literals, 3 new mock domains reset in the shared `afterEach`, 7 e2e specs, the
four batch-1 modules still green, and `mocks/core/list-query.ts` used by all
seven domains.

---

## 6. Outcome (batch closed)

All four gates green in one chain, run in the foreground by the orchestrator:

| Gate | Result |
|---|---|
| `pnpm typecheck` | ✅ exit 0 |
| `pnpm lint` | ✅ exit 0 |
| `pnpm test:run` | ✅ 23 files / 160 tests (was 14 / 88) |
| `pnpm test:e2e` | ✅ 52 passed (was 29) |
| `pnpm test:schematics` | ✅ 28 tests / 8 files (unchanged, still green) |

End state matches §5's expectation: 7 sidebar entries, 7 overview cards,
`MockRouteKey` at 35 literals, 3 new mock domains reset in the shared
`afterEach`, 7 e2e specs, all seven mock domains on `mocks/core/list-query.ts`,
and the batch-1 modules untouched apart from that retrofit.

Build sequence as planned: W1 (shared prep) → X1 (three standalone
`builder execute default:crud-module` runs — 33 files generated/edited, each
run reviewed against the Authors reference before the next step) → M1/M2/M3 in
parallel → VERIFY. No schematic needed extending: Coupon's `?status` filter
rode the existing `extraSearch` variation point as a declared input, exactly as
§2.4 predicted.

Deviations from the plan, and fixes applied during VERIFY:

- `src/features/coupons/presentation/coupon-form.test.tsx` failed once on
  `getByText('15%')` after the edit-then-detail navigation: the detail page
  refetches on the invalidated query and renders its skeleton first. Fixed in
  place with `findByText` plus a comment; no source change.
- `e2e/warehouses.spec.ts` failed twice on Playwright strict mode —
  `getByLabel('City')` substring-matches **Capacity** ("capa*city*") as well as
  the nested City input. Fixed with `{ exact: true }` on both call sites. Same
  class of locator collision as batch 1's `categories` fix; worth remembering
  for Invoice/Shipment, whose embedded objects also carry a `city` field.
- Supplier's list links the **ID** cell (Authors links the name) — decided at
  delegation time so the number key stays the row's identity anchor; the e2e
  spec navigates through it.
- Mechanic-level choices inside the specified design, accepted on review: the
  status `Select` navigates with `replace: true` (mirroring Reviews' verified
  Switch) and uses `size="sm"` to match the toolbar; the coupons mock's
  create-only date check uses the same strictly-after (`<=` rejects) semantics
  as the client schema.
- The Radix `Select` proved drivable in jsdom against the polyfills already in
  `src/test/setup.ts` — the pre-authorised URL-only contingency was not needed,
  and no test-setup file was modified.

Carried forward to the next plan:

- **Embedded-object fieldset** (Warehouse) and **enum Select list filter**
  (Coupon) are now proven first instances and are the declared rule. Their
  second instances land in batch 3 (Invoice `billing`, Payment `method`), which
  is the point at which extraction becomes evaluable under directive rule 1.
- **Mock domain factory + fixture** — deferred again; re-evaluate at batch 3.
  Its one byte-identical sub-shape now lives in `mocks/core/list-query.ts`.
- **List page / form / create-edit-detail pages** — deferred to batch 3 as
  batch 1 scheduled; batch 2 supplied the fieldset and Select-filter evidence
  that decision was waiting on.
- **Section tests / e2e specs** — still bespoke, still not generatable.
</content>
