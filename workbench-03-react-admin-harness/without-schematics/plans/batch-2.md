# Batch 2 — Supplier [T1], Coupon [T2], Warehouse [T2]

Orchestrator plan per `HARNESS.md`. Authority on architecture/patterns is
`AGENTS.md`; design language is `DESIGN.md`. Reference module: **Author**
(`src/features/authors/**`, `mocks/domains/authors.mock.ts`, `src/routes/authors/**`,
`e2e/authors.spec.ts`); the closest T2 precedent is **Review** (batch 1), which owns
the URL-filter idiom, the required-date idiom and the two-sided numeric range.

Baseline confirmed green before any change (orchestrator, foreground):
`pnpm typecheck` · `pnpm lint` · `pnpm test:run` (12 files / 76 tests) ·
`pnpm test:e2e` (29 tests).

`plan-directives/` does not exist — no external directives to incorporate.

---

## 1. Modules

### 1.1 Supplier — Tier T1

Fields (`entities-benchmark.txt:57-61`): `supplierId: number, required, unique` ·
`name: string, required` · `email: string, required, unique` ·
`phone: string, optional`.

| File | Mirrors |
|---|---|
| `mocks/core/types.ts` (+5 keys `LIST_SUPPLIERS`…`DELETE_SUPPLIER`) | existing union |
| `mocks/fixtures/suppliers.fixture.ts` (24 rows) | `authors.fixture.ts` |
| `mocks/domains/suppliers.mock.ts` (+ `resetSuppliers`, + `supplierExists`) | `authors.mock.ts` |
| `mocks/domains/suppliers.mock.spec.ts` | `authors.mock.spec.ts` |
| `mocks/handlers.ts` · `mocks/setup-test-mocking.ts` | existing |
| `src/features/suppliers/domain/supplier.ts` | `domain/author.ts` |
| `src/features/suppliers/infrastructure/suppliers.api.ts` | `infrastructure/authors.api.ts` |
| `src/features/suppliers/application/use-suppliers.ts` | `application/use-authors.ts` |
| `src/features/suppliers/presentation/suppliers-page.tsx` | `authors-page.tsx` |
| `…/supplier-form.tsx` · `…-create-page.tsx` · `…-edit-page.tsx` · `…-detail-page.tsx` | Author equivalents |
| `…/suppliers-page.test.tsx` · `…/supplier-form.test.tsx` | Author equivalents |
| `src/routes/suppliers/{index,new}.tsx`, `src/routes/suppliers/$supplierId/{index,edit}.tsx` | `src/routes/authors/**` |
| `src/app/shell/app-sidebar.tsx` (one NAV line) · `src/routes/index.tsx` (card) | existing |
| `e2e/suppliers.spec.ts` | `e2e/authors.spec.ts` |

No badge component: Supplier is the first entity in the tree with **no boolean field**.

### 1.2 Coupon — Tier T2

Fields (`entities-benchmark.txt:86-90`): `code: string, required, unique` ·
`discount: number, required, 1..100` · `expiresAt: date, required` ·
`active: boolean, required, default true`.

Same file list with `coupons`/`coupon`, key param `$code` (string — no `Number(...)`
cast in the route component), **plus**:

- `src/features/coupons/presentation/coupon-status-badge.tsx` (quirk b, entity-local)
- the status `Select` is inlined in `coupons-page.tsx` (quirk c)
- `src/shared/lib/dates.ts` — shared "today" helper (orchestrator-owned, §3.0)

### 1.3 Warehouse — Tier T2

Fields (`entities-benchmark.txt:100-108`): `code: string, required, unique` ·
`name: string, required` · `capacity: number, required, min 0` ·
`location: embedded, required { street, city, latitude -90..90, longitude -180..180 }`.

Same file list with `warehouses`/`warehouse`, key param `$code`. No badge component
(second entity with no boolean). The embedded object needs no extra file — it is a
nested Zod schema in `domain/warehouse.ts` and a `FieldSet` block in the form.

---

## 2. Pattern inventory (scout report, incorporated)

Scout ran read-only over `AGENTS.md`, `DESIGN.md`, `entities-benchmark.txt`,
`plans/batch-1.md`, the full Author reference module, the Book/Category/Review deltas,
all mock domains, `src/shared/**`, `src/components/ui/**` and the configs. None of
Supplier/Coupon/Warehouse exists in the tree — every module is a new file set — but
the amount of genuinely new *design* work varies sharply per module.

### Supplier — EXISTS, ~90 % pure mirror of Author, one real gap

Supplier is Author's exact field shape (numeric unique key + unique email + one
optional string) minus the boolean.

- **Numeric unique key + unique email, both 409** already exists on Author itself:
  `mocks/domains/authors.mock.ts:102-103` (POST checks `authors.has(id)` then
  `emailTaken(email)`), `authors.mock.ts:127` (PATCH re-checks with the `exceptId`
  exclusion from `authors.mock.ts:56-60`), proven by `authors.mock.spec.ts:76-88`.
  Copy verbatim. **Not new.**
- **Optional plain string** (`phone`) = Author's `country`:
  `src/features/authors/domain/author.ts:15` + the `'' → undefined` `setValueAs`
  mapping at `author-form.tsx:90-93`. Direct copy.
- **Deviation**: Supplier is the first entity with **zero booleans**. No `Switch`, no
  `Controller` block, no `defaultValues: { … }` seed, and the
  `authorSchema.extend({ active: z.boolean().optional() })` line (`author.ts:22-24`)
  has nothing to extend — a reflexive copy would be wrong. See §3.1.

**Repetition ahead**: Supplier's field shape does not recur; its *role* does —
Invoice (batch 3) resolves `supplierId` through the shared `RelationCombobox` over
`GET /suppliers?q=`, so `suppliers.mock.ts` must export `supplierExists(supplierId)`
exactly as `books.mock.ts:42-44` exports `bookExists` (consumed at
`reviews.mock.ts:5,120,145`). That is the batch-1 idiom; just execute it.

### Coupon — base CRUD EXISTS; all three quirks are NEW

`code` (string key like Book's `isbn`), `discount` (two-sided range like Review's
`rating`, `review.ts:19-23`), `expiresAt` (required date like Review's `reviewedAt`,
`review.ts:26`) and `active` (boolean default true like Author's) are fully covered
by existing idioms. The quirks are not:

**(a) mode-dependent cross-field validation.** `grep -rn "refine\|superRefine" src mocks`
returns **zero hits** — the codebase has never used a cross-field refinement, and no
form varies its schema by create-vs-edit. What exists is the mode signal itself: every
form switches on `entity !== undefined` to disable the key input
(`author-form.tsx:46`, `review-form.tsx:79`). Server-side, every mutating handler
re-validates independently (`authors.mock.ts:47-54`, `reviews.mock.ts:60-77`) and
`AGENTS.md:77` requires a 400 on invalid create regardless of client checks.
Field-level *server* errors do not exist as infrastructure: `mocks/core/errors.ts:11-25`
returns `{ error: message }` only, and the single field-targeted error in the tree is
client-side (`review-form.tsx:60-67`, `setError('bookIsbn', …)` after a 404). Decision
in §3.3.

**(b) derived status from a date comparison.** `grep -rn "new Date(" src mocks` returns
**zero hits** — nothing in the tree reads the current date. There is also **no clock
control in tests**: `src/test/setup.ts:1-28` stubs only `matchMedia`/`ResizeObserver`/
pointer-capture/`scrollIntoView`; neither `vite.config.ts:28-38` nor
`playwright.config.ts` fixes a date. Literal fixture dates (`'2024-05-01'`,
`e2e/reviews.spec.ts:40`) therefore cannot be used for anything expiry-related without
rotting as the calendar advances. Decision in §3.0/§3.4.

**(c) tri-state enum URL filter** vs Review's boolean `?verified`:

| Layer | Review (boolean) | Coupon (enum) |
|---|---|---|
| route `validateSearch` | `src/routes/reviews/index.tsx:12` `verified: z.boolean().default(false).catch(false)` | `z.enum(['all','active','expired']).default('all').catch('all')` |
| feature list params | `reviews.api.ts:7-9` `interface ReviewListParams extends ListParams { verified?: boolean }` | same shape, enum-typed value |
| `toQueryString` extra | `reviews.api.ts:19` `{ verified: params.verified ? 'true' : undefined }` | omit when `'all'`, not when falsy |
| mock parser | `reviews.mock.ts:56` `verified: get('verified') === 'true'` | parse + fall back to `'all'` on garbage |
| mock filter | `reviews.mock.ts:93` one boolean branch | two live branches + pass-through |
| toolbar control | `Switch` + `Label` (`reviews-page.tsx:103-113`) | first `Select` in a list toolbar (`src/components/ui/select.tsx`, so far unused) |

The **plumbing skeleton is the locked three-point idiom**; every point still needs
enum-specific code. Downstream: Payment `?method` (4-way, batch 3) and Event `?status`
(3-way, batch 4) repeat this shape — **2 direct repeats**. Ticket's `?from&to`
(batch 4) is a different shape (date range) and must not be conflated with it.

### Warehouse — NEW: first embedded object in the tree

`code`/`name`/`capacity` are pure repeats (Book's `pages` min-idiom, `book.ts:16`).
`location` is new on three axes:

1. **Nested RHF + zodResolver.** Every existing form registers flat top-level keys
   (`register('pages', { valueAsNumber: true })`, `book-form.tsx`); nothing registers
   a dot-path or nests a Zod object. RHF/zodResolver support it natively, but the
   error-render idiom in the tree is flat (`book-form.tsx:67-71`) and becomes
   `errors.location?.city` / `aria-invalid={errors.location?.city !== undefined}` —
   no copy-paste source exists.
2. **Grouped fieldset.** `src/components/ui/field.tsx:8-19,21-37` ships `FieldSet`
   (native `<fieldset>`) and `FieldLegend` (native `<legend>`), currently unused by
   any feature — Author/Book/Category/Review hand-roll `<div className="space-y-2">`.
   `DESIGN.md` is silent on form composition. Adoption scope is a design call (§3.6).
3. **Non-integer two-sided ranges** on sibling fields with different bounds
   (lat ±90, lng ±180) — first decimal numeric range in the tree.

Mock side: no domain validates a nested object today (`validateUpsert` functions are
flat, `reviews.mock.ts:60-77`) and no `q` filter reaches into nested data
(`authors.mock.ts:69-76`). Whether `q` searches `location.*` is a decision, not an
inference (§3.7).

**Repetition ahead**: Invoice `billing {street, city, zipCode}` (batch 3) and Shipment
`destination {street, city, country}` (batch 4) are **2 further, simpler** embedded
objects (three strings, no nested ranges). Warehouse's lat/lng bounds stay
Warehouse-only.

### Look-ahead over the remaining schedule (batches 3–5)

| New shape (this batch) | Reused later | Count |
|---|---|---|
| `<entity>Exists()` producer (Supplier) | Invoice → `supplierExists` (batch 3) | 1 |
| Two-unique-field 409 pairing | Employee (batch 5) | 1 |
| Cross-field `refine` (Coupon, create-only) | Payment `processedAt` when `confirmed` (b3), Shipment `shippedAt` when `delivered` (b4) — same mechanism, always-on condition | 2 |
| Enum URL filter + toolbar `Select` | Payment `?method` (b3), Event `?status` (b4) | 2 |
| Embedded object (zod + RHF dot-paths + `FieldSet` + nested mock validation + nested list column) | Invoice `billing` (b3), Shipment `destination` (b4) | 2 |
| Clock-relative fixtures/tests (`src/shared/lib/dates.ts`) | any later date-relative assertion; no other spec'd quirk needs it | 0 required |

### Mechanical facts (from scout; binding for all delegations)

- `mocks/core/types.ts:14-34` — `MockRouteKey` union, last entry `'DELETE_REVIEW'`;
  new keys append after it.
- `mocks/handlers.ts:5-8` imports · `mocks/handlers.ts:28-33` the returned array;
  one import + one spread per domain.
- `mocks/setup-test-mocking.ts:4-7` imports · `:36-42` the `afterEach`; one import +
  one `reset<Plural>()` call per domain.
- `src/app/shell/app-sidebar.tsx:2` icon import · `:13-19` the `NAV` array.
- `src/routes/index.tsx:2` icon import · `:20-85` the entity-card section.
- `PAGE_SIZE = 10` per page component (`authors-page.tsx:38`, `reviews-page.tsx:41`),
  matching each mock's `parsePage` default (`authors.mock.ts:42`). Fixtures: **24 rows**
  → "Page 1 of 3", parity with every existing domain.
- `src/routeTree.gen.ts` is generated + gitignored (`vite.config.ts` `tanstackRouter`
  plugin) and imported by `src/test/render-app.tsx:4` — **run `pnpm typecheck` before
  `pnpm test:run` whenever routes change**.
- `renderApp(path)` (`src/test/render-app.tsx:11-30`) renders the real router +
  providers and returns `{ ...result, router }`; section tests assert on
  `router.state.location.{pathname,search}`.
- e2e spec shape (`e2e/reviews.spec.ts:1-113`): list+pagination, search, create,
  detail+edit, delete-with-confirmation, duplicate-key 409 as visible text, quirk
  scenarios, and an axe scan of the list and `/new` pages filtered to
  `serious`/`critical` → `[]`.
- `.oxlintrc.json` disables `react/only-export-components` only for `src/routes/**`
  and `src/components/ui/**`; keep one component per file elsewhere.
- jsdom stubs for `scrollIntoView`, pointer capture, `ResizeObserver`, `matchMedia`
  exist in `src/test/setup.ts:7-28`, so Radix `Select`/`Popover` are usable in section
  tests.
- `vite.config.ts` `test.env.VITE_API_BASE` is absolute; all infra goes through
  `shared/api/client.ts`.
- Cross-feature import rule (batch 1 §2, still binding): a feature may import another
  feature's `domain`/`infrastructure`/`application`, never its `presentation`.

---

## 3. Orchestrator design decisions (mechanics implement, never decide)

**3.0 `src/shared/lib/dates.ts` (orchestrator-owned, wave 0).** One place defines
"today" for both the app and the mocks:

```ts
export function todayIso(): string            // UTC, YYYY-MM-DD
export function isoDateOffset(days: number): string  // today ± days, YYYY-MM-DD
```

`todayIso()` is UTC so client and mock always agree. `isoDateOffset` is what fixtures
and section tests use instead of literal dates for anything expiry-relative. E2E specs
**must not import from `src/`** — they define a two-line local helper instead, keeping
Playwright free of alias resolution.

**3.1 Supplier has no defaulted field.** `supplierUpsertSchema = supplierSchema` (an
alias, no `.extend()`), `SupplierUpsert = z.infer<typeof supplierUpsertSchema>`, no
`Switch`/`Controller` in the form, `defaultValues: supplier` (undefined on create).

**3.2 `q` coverage and sort order per domain.**
- suppliers → `name`, `email`, `phone`, `String(supplierId)` (the id is searchable so
  Invoice's combobox can resolve a free-typed id in batch 3); sorted by `supplierId` asc.
- coupons → `code` only (`discount`/`expiresAt` are not text); sorted by `code`
  `localeCompare`.
- warehouses → `code`, `name`; sorted by `code` `localeCompare`.

**3.3 Coupon quirk (a) — mode-dependent schema.** The domain exports a **schema
factory**, not two sibling schemas:

```ts
export const couponUpsertBaseSchema = couponSchema.extend({ active: z.boolean().optional() })
export type CouponUpsert = z.infer<typeof couponUpsertBaseSchema>

/** Create requires a future expiry; edit may keep a past date (spec quirk a). */
export function couponUpsertSchema(mode: 'create' | 'edit') {
  return mode === 'create'
    ? couponUpsertBaseSchema.refine((values) => values.expiresAt > todayIso(), {
        path: ['expiresAt'],
        message: 'Expiry date must be in the future',
      })
    : couponUpsertBaseSchema
}
```

`CouponForm` calls `zodResolver(couponUpsertSchema(coupon ? 'edit' : 'create'))`. The
violation therefore renders through the existing per-field `<p role="alert">` under
`expiresAt` — **a field error, never a toast**, as the spec demands. The server
re-checks on `POST` only and returns `400 expiresAt must be a future date`; the wire
error shape stays `{ error: message }` (**no structured field-keyed 400 body** — that
would be a new wire contract, and the client already prevents the case), surfaced by
the existing form-level `serverError` paragraph if it ever fires.

**3.4 Coupon quirk (b) — derived status lives in the domain.** `domain/coupon.ts`
exports the pure derivation used by the list, the detail page **and** the mock filter,
so the three can never disagree:

```ts
export type CouponStatus = 'Active' | 'Disabled' | 'Expired'
export function isExpired(coupon: Pick<Coupon, 'expiresAt'>, today = todayIso()): boolean
export function couponStatus(coupon: Coupon, today = todayIso()): CouponStatus
```

`Expired` wins over the flag. `coupon-status-badge.tsx` mirrors `active-badge.tsx`
(outline `Badge` + dot): Active → `bg-success`, Disabled → `bg-muted-foreground`,
Expired → `bg-destructive`, with the status word as the badge text. No hardcoded colors.

**3.5 Coupon quirk (c) — `?status` filter.** Route search
`status: z.enum(['all', 'active', 'expired']).default('all').catch('all')`;
`CouponListParams extends ListParams { status?: CouponStatusFilter }`; forwarded via
`toQueryString(params, { status: params.status && params.status !== 'all' ? params.status : undefined })`
so `all` never reaches the URL; the mock parses it (unknown values → `'all'`) and
filters **after** `q` with `expired → isExpired(c)`, `active → !isExpired(c) && c.active`.
Control: shadcn `Select`, trigger `aria-label="Status filter"`, items `All`/`Active`/
`Expired`. If Radix `Select` proves unworkable under jsdom after a genuine attempt,
the sanctioned fallback is a segmented `Button` group with `aria-pressed` — nothing else.

**3.6 Warehouse quirk (a) — embedded rendering scope.** Only the `location` group
adopts `FieldSet` + `FieldLegend` (`<FieldLegend variant="label">Location</FieldLegend>`).
The four flat fields, and the nested fields *inside* the fieldset, keep the established
`<div className="space-y-2">` + `Label` + `Input` + `<p role="alert" className="text-xs text-destructive">`
idiom, so error rendering stays uniform across the whole tree. **Existing forms are not
restyled.** Nested registration: `register('location.street')`,
`register('location.latitude', { valueAsNumber: true })`; errors read
`errors.location?.latitude`; each nested input carries its own `id`/`htmlFor`
(`location.city` → `id="location.city"`, label "City").

**3.7 Warehouse `q` excludes nested fields** (§3.2) — `location.*` is a read concern
(the City column), not a search one. Documented in the mock's header comment so batch 3
doesn't have to re-decide.

**3.8 List columns.**
- Suppliers: Supplier ID · Name (link to detail) · Email · Phone (`—` when absent) · actions
- Coupons: Code (link) · Discount (`25%`) · Expires (`YYYY-MM-DD`) · Status (badge) · actions
- Warehouses: Code · Name (link) · City (`location.city`) · Capacity · actions

**3.9 Detail pages** mirror `review-detail-page.tsx` (`Card` + `dl`). Warehouse's
`location` renders as its own labelled group (Street/City/Latitude/Longitude) below the
flat fields; Coupon's detail shows the same derived status badge as the list.

**3.10 Pinned fixture contract** (tests reference these, so they are contract; the
remaining rows are the mechanic's choice, all keys unique, 24 rows each):

| Domain | Pinned |
|---|---|
| suppliers | `supplierId: 1` → `Nordic Paper Co.`, `orders@nordicpaper.example`, phone set; at least one row with **no** phone |
| coupons | exactly **8 expired** (`isoDateOffset(-n)`, n ≥ 1), **16 unexpired** of which **12 `active: true`** and **4 `active: false`** → `?status=expired` = 8, `?status=active` = 12, no filter = 24. Alphabetically first code is `AUTUMN15` (expired, `discount: 15`, `active: true`); `SUMMER10` is unexpired (`isoDateOffset(30)`), `active: true`, `discount: 10` |
| warehouses | alphabetically first code is `AMS-01` → `Amsterdam Central`, city `Amsterdam`, `capacity: 12000`, lat `52.3676`, lng `4.9041` |

Coupon fixture dates are **computed with `isoDateOffset`, never literals** (§3.0).

**3.11 Sidebar / overview icons**: Suppliers `Truck`, Coupons `BadgePercent`,
Warehouses `Warehouse` (lucide-react). If an icon name does not exist in the installed
version, fall back to `Package` / `Percent` / `Building2` respectively.

**3.12** `PAGE_SIZE = 10`, 24 fixture rows → "Page 1 of 3" for all three modules.

---

## 4. Delegation plan

Every unit edits the same five shared files (`mocks/core/types.ts`,
`mocks/handlers.ts`, `mocks/setup-test-mocking.ts`, `src/app/shell/app-sidebar.tsx`,
`src/routes/index.tsx`) and self-verifies with whole-project gates, so — per batch 1's
recorded lesson — the mechanic delegations are **serialised**, each a blocking
foreground call:

| Wave | Unit | Agent | Depends on |
|---|---|---|---|
| 0 | `src/shared/lib/dates.ts` (`todayIso`, `isoDateOffset`) | orchestrator | — |
| 1 | **Supplier** module: full drill + wiring + tests + e2e | `mechanic` | — |
| 2 | **Coupon** module: full drill + quirks a/b/c + tests + e2e | `mechanic` | waves 0, 1 |
| 3 | **Warehouse** module: full drill + quirks a/b + tests + e2e | `mechanic` | wave 2 |

Each delegation prompt carries: the exact file list, the reference file to mirror per
file, the entity's spec lines from `entities-benchmark.txt`, the §3 decisions that
apply, and the tests it must include. Each mechanic runs `pnpm typecheck`, `pnpm lint`
and `pnpm test:run` itself (typecheck **before** tests, routes are generated) and does
**not** run `pnpm test:e2e` — a single dev server owns port 3010 and the orchestrator
runs that gate. The orchestrator reviews every delivery against §1–§3 before the next
wave starts.

---

## 5. Verification plan

Per module, before it counts as delivered:

1. **Mock-infra spec** (`mocks/domains/<plural>.mock.spec.ts`): default page size 10 +
   total 24; page 3 holds the remaining 4; `q` filters across exactly the documented
   fields (§3.2); `GET` 200/404; `POST` 201 (+ boolean default where the entity has
   one); 400 on invalid; 409 on the duplicate unique key **and** on a second unique
   field where one exists; `PATCH` partial merge; `DELETE` 204 then 404; state reseeds.
   - Supplier: 409 on duplicate `supplierId` *and* on duplicate `email`; PATCH to an
     email owned by another supplier → 409, to its own email → 200.
   - Coupon: `?status=active` → 12, `?status=expired` → 8, unknown value → 24;
     `?status` combines with `q`; `POST` with a past `expiresAt` → 400; `PATCH` with a
     past `expiresAt` → 200 (quirk a's edit exemption, server side).
   - Warehouse: nested validation — missing `location.city` → 400, `latitude: 999` →
     400, `longitude: -200` → 400; `capacity: -1` → 400; `q` does **not** match a city.
2. **Section tests** (`src/features/<plural>/presentation/*.test.tsx`): list renders
   page 1 from the API, search filters, Next → "Page 2 of 3", row-menu delete with
   confirmation removes the row; form shows validation errors on empty submit without
   navigating, creates and returns to the list, surfaces the server conflict on a
   duplicate unique value.
   - Supplier: duplicate `email` conflict surfaced too; optional `phone` may be empty.
   - Coupon (a) create with a past date → `Expiry date must be in the future` under
     `expiresAt`, no navigation, **no toast**; editing `AUTUMN15` (past date) and saving
     succeeds. (b) the `AUTUMN15` row shows `Expired`, a future+active row shows
     `Active`, a future+`active:false` row shows `Disabled`. (c) choosing `Expired` in
     the Status filter puts `status: 'expired'` in `router.state.location.search` and
     narrows the list to 8; back to `All` restores 24.
   - Warehouse (a) empty submit reports per-nested-field errors (`Street is required`,
     `City is required`, `Latitude is required`, `Longitude is required`); `latitude: 999`
     reports `Latitude must be between -90 and 90`; a full nested create succeeds; the
     `location` group is inside a `<fieldset>` with the legend `Location`.
     (b) the `AMS-01` row shows `Amsterdam` in the City column.
3. **E2E** (`e2e/<plural>.spec.ts`, mirroring `e2e/reviews.spec.ts`): list +
   pagination, search, create, detail + edit, delete with confirmation, duplicate-key
   server error, each entity's quirks, and an axe scan of the list and `/new` pages
   asserting zero serious/critical violations. Coupon/Warehouse e2e compute dates with
   a local helper — no imports from `src/`, no literal expiry dates.
4. **Gates** — the orchestrator runs, in the foreground, until all four are green:
   `pnpm typecheck && pnpm lint && pnpm test:run && pnpm test:e2e`.
   Expected final counts: 7 mock specs, 12 section-test files, 7 e2e specs.

---

## 6. Execution record

Waves ran in the planned order: 0 (orchestrator: `src/shared/lib/dates.ts`) → 1
(Supplier, `mechanic`) → 2 (Coupon, `mechanic`) → 3 (Warehouse, `mechanic`). Each
delivery was reviewed against §1–§3 before the next wave started; no plan deviations
were needed and no mechanic made a design call of its own.

Resolutions the mechanics reported, all consistent with §3:

- **Coupon's schema factory needed an explicit return annotation.** `zodResolver`
  could not infer from the union of a plain object schema and its refined variant;
  annotating `z.ZodType<CouponUpsert, CouponUpsert>` (Input pinned as well as Output)
  fixed it. The single factory of §3.3 stayed — no sibling schemas, no casts.
- **Radix `Select` drove cleanly under jsdom** on the first attempt (trigger exposes
  `role="combobox"`, items `role="option"`), so §3.5's segmented-button fallback was
  never needed. The enum-filter idiom is therefore locked for Payment and Event.
- **Warehouse fixture wording**: `IST-01` was named "Bosphorus Gateway" so that
  "Istanbul" exists only in `location.city` — otherwise the "`q` does not match a
  city" assertion (§3.7) would have had nothing to prove.
- Edit pages navigate to the entity's **detail** page on success, which is what every
  pre-existing module does; §5's "returns to the list" wording applies to creates.

**Orchestrator fixes after the first full gate run** (both defects were in the e2e
specs, which the mechanics write but do not execute — the app code was correct):

1. `e2e/warehouses.spec.ts` — `getByLabel('City')` matched two inputs, because
   Playwright's label matching is substring-based and **"Capa*city*" ends in "city"**.
   Fixed with `{ exact: true }` on the three City fills, with a comment so the next
   embedded-object module (Invoice `billing`, Shipment `destination`) does not repeat it.
2. `e2e/coupons.spec.ts` — the detail/edit and delete tests targeted `SUMMER10`, but
   the list sorts by `code`, so only `AUTUMN15…JUBILEE20` are on page 1. Retargeted to
   `ICONIC15` (unexpired/active, discount 15) and `BLACKFRIDAY20` (expired), with a
   comment recording the page-1 window. Section tests were unaffected.

**Final gate run (orchestrator, foreground)** — all four green:

| Gate | Result |
|---|---|
| `pnpm typecheck` | pass |
| `pnpm lint` | pass (oxlint, no findings) |
| `pnpm test:run` | 21 files / 156 tests passed |
| `pnpm test:e2e` | 53 tests passed (suppliers 8, coupons 9, warehouses 9 added to batch 1's 27) |

Delivered: 7 mock specs, 12 section-test files, 7 e2e specs — Batch 2 is done.
Shapes established here for later batches: the clock-relative date helper
(`src/shared/lib/dates.ts`), the mode-dependent Zod schema factory (Payment and
Shipment reuse the mechanism), the enum URL filter + toolbar `Select` (Payment, Event),
the embedded-object idiom — nested schema, dot-path registration, `FieldSet`/
`FieldLegend` scoped to the group, nested mock validation, nested list column (Invoice
`billing`, Shipment `destination`) — and `supplierExists()` for Invoice's relation.
