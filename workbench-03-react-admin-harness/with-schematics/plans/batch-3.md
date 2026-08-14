# Batch 3 — Vehicle [T1], Invoice [T2], Payment [T2]

Orchestrated per `HARNESS.md`. Authority on architecture: `AGENTS.md`. Design
language: `DESIGN.md`. Plan directives incorporated:
`plan-directives/schematics.md` (decisions recorded under **Schematic
decisions**, §3).

Baseline measured before planning (Authors + batch-1 + batch-2 modules):
`pnpm typecheck` ✅ exit 0 · `pnpm lint` ✅ exit 0 · `pnpm test:run` ✅ 23 files /
160 tests · `pnpm test:e2e` ✅ 52 passed (batch-2 close-out). Every gate is green
today, so any red during this batch is ours.

Batch 3 is the **scheduled decision point** both prior plans deferred to: with 7
proven module instances in the tree, the "list page / form / create-edit-detail
pages" schematic question must be resolved here with evidence (§2.11b, §3).

---

## 1. Modules

### 1.1 Vehicle [T1] — `vehicles`, key `plate: string`

| Field | Type / rules |
|---|---|
| `plate` | string, required, **unique** (lookup key) |
| `brand` | string, required |
| `model` | string, required |
| `year` | number, required, integer, min 1950 |
| `electric` | boolean, required, default `false` |

Files:

```
mocks/fixtures/vehicles.fixture.ts            24 rows (3 real pages)
mocks/domains/vehicles.mock.ts                vehicleHandlers() + resetVehicles()
mocks/domains/vehicles.mock.spec.ts
mocks/core/types.ts                           + 5 route keys                [generated edit]
mocks/handlers.ts                             + import/spread               [generated edit]
mocks/setup-test-mocking.ts                   + resetVehicles()             [generated edit]
src/features/vehicles/domain/vehicle.ts       vehicleSchema, vehicleUpsertSchema, vehicleKey()
src/features/vehicles/infrastructure/vehicles.api.ts                        [generated]
src/features/vehicles/application/use-vehicles.ts                           [generated]
src/features/vehicles/presentation/vehicles-page.tsx
src/features/vehicles/presentation/vehicle-form.tsx
src/features/vehicles/presentation/vehicle-create-page.tsx                  [generated, §3]
src/features/vehicles/presentation/vehicle-edit-page.tsx                    [generated, §3]
src/features/vehicles/presentation/vehicle-detail-page.tsx
src/features/vehicles/presentation/electric-badge.tsx
src/features/vehicles/presentation/vehicles-page.test.tsx
src/features/vehicles/presentation/vehicle-form.test.tsx
src/routes/vehicles/index.tsx  new.tsx  $plate/index.tsx  $plate/edit.tsx    [generated]
src/app/shell/app-sidebar.tsx                 + NAV line (icon `Car`)       [generated edit]
src/routes/index.tsx                          + overview card               [generated edit]
e2e/vehicles.spec.ts
```

Reference to mirror: **Book** (string key, bounded number, badge column) with
the boolean flipped to Review's `default false` idiom. Vehicle is the first T1
entity with **no optional field and no date field** — the `'' → undefined`
`setValueAs` idiom and `isoDateSchema` are simply absent (a simplification, not
a deviation).

List columns: Plate (link to detail) · Brand · Model · Year · Drivetrain
(badge) · row actions. Sort by `plate` ascending (`localeCompare`); `q` searches
`plate | brand | model`.

Decisions (mine — the mechanic implements, never decides):

- `year` uses the established single-message convention for bounded numbers
  (`review.ts:19-27`, `coupon.ts:12-21`): one string, `YEAR_MESSAGE = 'Year must
  be a whole number from 1950 onwards'`, passed as the base `z.number()` error
  **and** to `.int()`/`.min(1950)`, so a blank input reads that message instead
  of "expected number, received NaN".
- `electric-badge.tsx` mirrors `in-print-badge.tsx` exactly (the `Badge
  variant="outline"` + status-dot idiom): `bg-success` dot + label **Electric**
  when true, `bg-muted-foreground` dot + label **Combustion** when false. The
  column header is **Drivetrain**.
- Fixture: 24 rows, deterministic — exactly **8** electric, 16 combustion; plates
  are uppercase `AAA-1234` shapes, unique; years spread 1998–2024 with at least
  one 1950 boundary row. Tests assert the 8/16 split and the `total` of 24.

### 1.2 Invoice [T2] — `invoices`, key `invoiceNumber: number`

| Field | Type / rules |
|---|---|
| `invoiceNumber` | number, required, integer, **unique** (lookup key) |
| `supplierId` | number, required — **RELATION → suppliers** |
| `total` | number, required, **> 0** |
| `issuedAt` | date (`YYYY-MM-DD`), required |
| `paid` | boolean, required, default `false` |
| `billing` | **embedded**, required |
| `billing.street` | string, required |
| `billing.city` | string, required |
| `billing.zipCode` | string, required |

Same file set as Vehicle with `invoice`/`invoices`, key param `$invoiceNumber`,
plus `presentation/supplier-combobox.tsx` and
`presentation/invoice-paid-switch.tsx` (no status badge — `paid` is the inline
switch). Sidebar/overview icon `ReceiptText`.

List columns: Invoice # (link) · Supplier · Total (USD) · Issued · Paid
(switch) · row actions. Sort by `invoiceNumber` ascending; `q` searches
`billing.street | billing.city | billing.zipCode` (the entity's only string
fields — same rule Warehouse applied to its nested `location.city`).

Quirk decisions (mine):

- **(a) RELATION — numeric key.** `supplier-combobox.tsx` mirrors
  `reviews/presentation/book-combobox.tsx:31-88` structurally: `Popover` +
  `Command`, options from `useSuppliersList({ q: query, pageSize: 10 })` (a
  legal presentation → application cross-feature import), each rendered as
  `` `${supplier.name} (${supplier.supplierId})` ``. **The one deviation the
  precedent does not cover is the key type** — `bookIsbn` is a string and free
  typing assigns the raw text; `supplierId` is a number, so:
  - `SupplierComboboxProps.value: number | undefined`,
    `onChange: (supplierId: number | undefined) => void`.
  - Free typing stays allowed (the spec's relation contract is "an id that does
    not exist must fail validation"), with coercion at the boundary:
    `handleQueryChange(text)` sets the local query **and** calls
    `onChange(text.trim() === '' ? undefined : Number(text))`. `Number('abc')`
    is `NaN`, which the base schema rejects with the field's own required
    message — never a leaked "received NaN".
  - `CommandItem` `value` is `String(supplier.supplierId)`; `handleSelect`
    passes the number.
  - The trigger label mirrors Review verbatim — the **raw value**
    (`value === undefined || Number.isNaN(value) ? 'Select a supplier…' :
    String(value)`). Resolving the name inside the trigger is deliberately NOT
    done: the option set is query-dependent, so the label would flicker between
    `name (id)` and `id` as the user types. Name resolution belongs to the list
    column, where the row set is stable (below).
  - Existence check, client side: an **async** `superRefine` in
    `invoice-form.tsx`, mirroring `review-form.tsx:33-44` — skip when the value
    is `undefined`/`NaN`, else `await suppliersApi.get(values.supplierId)` and on
    failure `ctx.addIssue({ code: 'custom', path: ['supplierId'], message:
    `Supplier "<id>" does not exist` })`. `zodResolver` awaits `parseAsync`, so
    this surfaces as a **field error**, never a toast, and does not navigate.
  - Existence check, server side (second line of defence, exactly as Review):
    `supplierExists(supplierId: number)` is added as a **one-function export** to
    `mocks/domains/suppliers.mock.ts`, mirroring `mocks/domains/books.mock.ts:41-43`,
    and called from the invoices domain's `validateUpsert` → 400
    `Supplier "<id>" does not exist`. This is the only edit to an existing green
    mock domain in this batch, and it is authorised here (§1.4.2).
  - List Supplier column: resolve id → name from `useSuppliersList({ pageSize: 100 })`
    — the same cross-feature resolution `reviews-page.tsx:53-59` proved — and
    render `` `${name} (${id})` `` when resolvable, else `#${id}`.
- **(b) INLINE ACTION — Paid switch.** `invoice-paid-switch.tsx` is a
  **per-row component** (so each row owns its own `useUpdateInvoice(row.invoiceNumber)`
  instance — hooks are never called in a loop) rendering a `Switch` with
  `aria-label={`Mark invoice ${invoiceNumber} as paid`}`, `checked={invoice.paid}`,
  and `onCheckedChange={(checked) => update.mutate({ paid: checked }, { onError:
  (error) => toast.error(error.message) })}`, `disabled={update.isPending}`.
  - **No confirmation dialog** — this is an instant row mutation, unlike
    row-menu delete.
  - **Page/search state is preserved structurally, not restored**: the switch
    never navigates. `useUpdateInvoice`'s generated `onSuccess` invalidates
    `invoiceKeys.all`, so the list refetches **the same URL-derived query key**
    (`page`, `q` live only in the URL via `routeApi.useSearch()`). On failure the
    row snaps back to the server value for the same reason, and the toast is the
    only user-visible feedback — matching the spec's "invalidate … with a toast
    on failure". Success is silent (the spec asks for a failure toast only).
- **(c) CURRENCY.** `total` renders through the new shared `formatUsd`
  (§1.4.1) in the list cell and on the detail page: `$1,234.50`, always 2
  decimals. Raw numbers are never printed for money.
- **EMBEDDED `billing`** (spec field, governed by batch 2's declared rule):
  `billingSchema = z.object({ street, city, zipCode })` nested as
  `billing: billingSchema`, rendered as `FieldSet` + `FieldLegend` ("Billing")
  with the unchanged per-field `space-y-2` + `Label` + `Input` +
  `<p role="alert">` idiom, nested RHF names (`register('billing.city')`) and
  nested error reads (`errors.billing?.city`) — `warehouse-form.tsx:92-152`
  verbatim minus the bounded-number handling (all three fields are plain
  required strings). Mock: `validateBilling` walks `body.billing` and returns a
  per-nested-field message; PATCH replaces the whole embedded object as a value
  (`warehouses.mock.ts:139-144`). Detail page gives it its own labelled block
  (`warehouse-detail-page.tsx:95-116`).
- `total` uses the single-message convention: `TOTAL_MESSAGE = 'Total must be
  greater than 0'`; the input is `type="number"` `step="0.01"` with
  `valueAsNumber: true`.
- Fixture: 24 rows. Every `supplierId` is drawn from the **existing suppliers
  fixture range 1..24** so the relation always resolves; deterministic split of
  exactly **10 paid** / 14 unpaid; `issuedAt` fixed 2024 dates (no `todayIso()`
  dependency anywhere in this entity); `billing.city` values varied, with at
  least three sharing one city so the `q` test can narrow to a known count.

### 1.3 Payment [T2] — `payments`, key `paymentId: number`

| Field | Type / rules |
|---|---|
| `paymentId` | number, required, integer, **unique** (lookup key) |
| `amount` | number, required, **> 0** |
| `method` | enum `card` \| `transfer` \| `cash`, required |
| `processedAt` | date (`YYYY-MM-DD`), optional* |
| `confirmed` | boolean, required, default `false` |

Same file set as Vehicle with `payment`/`payments`, key param `$paymentId`,
plus `presentation/confirmed-badge.tsx`. Sidebar/overview icon `CreditCard`.

List columns: ID (link) · Amount (USD) · Method (label) · Processed
(`YYYY-MM-DD`, `—` when unset) · Confirmed (badge) · row actions. Sort by
`paymentId` ascending; `q` searches `method | processedAt` (the entity's only
string fields).

Quirk decisions (mine):

- **(a) CONDITIONAL — `processedAt` required when `confirmed`, on BOTH sides.**
  This is structurally *not* Coupon's create-only rule; it applies to create and
  edit alike and is driven by a **sibling field's value**. Therefore the domain
  exports two schemas with a different split from Coupon's:
  - `paymentUpsertSchema` — the plain object shape. It types `PaymentUpsert`,
    is what `paymentsApi` sends, and stays `.extend()`-able.
  - `paymentFormSchema = paymentUpsertSchema.superRefine((value, ctx) => { if
    (value.confirmed && !value.processedAt) ctx.addIssue({ code: 'custom', path:
    ['processedAt'], message: PROCESSED_REQUIRED_MESSAGE }) })` with
    `PROCESSED_REQUIRED_MESSAGE = 'Processed date is required when the payment
    is confirmed'`. **Both** the create and the edit form resolve against
    `paymentFormSchema` — unconditionally, with no create/edit branch (simpler
    wiring than Coupon's, which had one).
  - The refinement composes cleanly with the optional-date idiom: the form
    registers `processedAt` with the established
    `setValueAs: (v) => typeof v === 'string' && v.trim() === '' ? undefined : v`
    (`book-form.tsx:91-94`), so RHF hands the schema `undefined` — never `''` —
    before `optionalIsoDateSchema` or the refinement ever runs.
  - Server side, the payments mock enforces the same rule in `validateUpsert`,
    which POST checks on the body and PATCH checks on the **merged** body — so
    the rule holds on both verbs (unlike Coupon's deliberate POST-only check,
    `coupons.mock.ts:128-130`). Message: `processedAt is required when confirmed
    is true`.
  - This is the **first instance** of a sibling-field-driven conditional and is
    declared the rule for Shipment's `shippedAt`/`delivered` in batch 4
    (directive rule 2).
- **(b) CURRENCY.** `amount` renders through `formatUsd` (§1.4.1) in the list
  cell and on the detail page.
- **(c) METHOD FILTER.** `method: z.enum(['all','card','transfer','cash']).default('all').catch('all')`
  in the list route's `validateSearch` via the `crud-routes`/`crud-module`
  `extraSearch` input — the declared, unchanged variation point. The page
  forwards `filters: { method: method === 'all' ? undefined : method }` so
  `?method=all` never reaches the wire, and the **list endpoint** applies it
  before pagination so `total` reflects the filtered set (`coupons-page.tsx:48-58`
  + `coupons.mock.ts:39-43,70-77` mirrored 1:1 with four values instead of
  three). Control: the shadcn `Select`, `size="sm"`,
  `aria-label="Filter by method"`, `replace: true`, resets `page` to 1 and
  preserves `q` — Coupon's proven wiring verbatim.
- **Enum in a FORM.** `method` is the tree's first enum *entity* field. It
  renders as a `Select` bound through RHF `Controller` (the same `Controller` +
  `render={({ field }) => …}` shape every boolean `Switch` already uses,
  `review-form.tsx:157-166`), with `SelectTrigger` `id="method"` +
  `aria-invalid`, and a `<Label htmlFor="method">Method</Label>` above it, so the
  field keeps the standard `space-y-2` + `Label` + control + `role="alert"`
  idiom. Radix `Select` is proven drivable in jsdom against the polyfills in
  `src/test/setup.ts:25-28` (batch-2 outcome) — no test-setup change is
  authorised.
- **Labels.** `PAYMENT_METHOD_LABELS: Record<PaymentMethod, string> = { card:
  'Card', transfer: 'Transfer', cash: 'Cash' }` lives in the **domain** (one
  source of truth) and is consumed by the form Select, the list Method cell, the
  filter Select and the detail page. The raw enum value is never rendered.
- `confirmed-badge.tsx` mirrors `verified-badge.tsx`: labels **Confirmed** /
  **Pending**.
- `amount` uses the single-message convention: `AMOUNT_MESSAGE = 'Amount must be
  greater than 0'`; input `type="number"` `step="0.01"`, `valueAsNumber: true`.
- Fixture: 24 rows, deterministic — exactly **9 card / 8 transfer / 7 cash**;
  every `confirmed: true` row carries a `processedAt` (the fixture must satisfy
  the entity's own conditional rule), and at least 4 unconfirmed rows have
  `processedAt: undefined` so the `—` rendering and the conditional error are
  both reachable. Tests assert the 9/8/7 split.

### 1.4 Shared changes (mine, cross-cutting — decided here, built once)

1. **`src/shared/format/currency.ts`** — new module exporting
   `formatUsd(amount: number): string`, a module-level
   `new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD',
   minimumFractionDigits: 2, maximumFractionDigits: 2 })` wrapper. Rationale:
   two entities in this batch render money (Invoice `total`, Payment `amount`)
   and none afterwards; the sub-shape is *textually identical*, so — exactly as
   with `mocks/core/list-query.ts` in batch 2 — the right crystallisation is a
   shared function, not a schematic (§3). It is a formatter, not an entity rule,
   so it lives under a new `src/shared/format/` sibling rather than in
   `src/shared/domain/`. Formatter instance is created once at module load, not
   per render.
2. **`mocks/domains/suppliers.mock.ts`** — add one exported function
   `supplierExists(supplierId: number): boolean`, byte-mirroring
   `mocks/domains/books.mock.ts:41-43`, so the invoices domain can validate the
   relation server-side. **Nothing else in that file changes**, and
   `mocks/domains/suppliers.mock.spec.ts` gains one case asserting it. This is
   the same cross-domain-export shape batch 1 introduced for `bookExists` and is
   now the declared rule.

No other shared file changes. `ListParams.filters` already carries Payment's
`method` unchanged; `mocks/core/list-query.ts` and
`src/shared/domain/iso-date.ts` are reused as-is; no new shadcn primitive is
needed (`select`, `switch`, `field`, `command`, `popover` all exist and are
wired).

---

## 2. Pattern inventory (scout report, incorporated)

Read-only sweep by the `scout` sub-agent over `AGENTS.md`, `DESIGN.md`,
`entities-benchmark.txt`, both prior plans, `plan-directives/schematics.md`, all
8 schematics (`schema.json` + `factory.ts` + `helper.ts`), `mocks/core/*`, all 7
mock domains + fixtures + specs, `src/shared/**`, all 7 feature stacks, and
`src/components/ui/{select,switch,field,command,popover}.tsx`. 35 `MockRouteKey`
literals confirmed (`mocks/core/types.ts:14-49`, 7 entities × 5).

### 2.1 Vehicle [T1] — vanilla module

No single existing entity is a complete field-by-field mirror; Vehicle is a
**recombination of three separately-established mechanisms**, none of them new.

| Vehicle field | Closest established precedent | File:line |
|---|---|---|
| `plate: string, unique` (key) | String lookup key — the deviation from Authors' numeric key that Book/Category/Coupon/Warehouse already made (route param stays a string, key `<Input>` `disabled` when editing, no `Number()` cast) | `src/features/books/domain/book.ts:23,40-42`, `schematics/crud-routes/helper.ts:59` |
| `brand: string, required` | Plain required string — the `title`/`name` idiom | `src/features/books/presentation/book-form.tsx:57-64` |
| `model: string, required` | No exact precedent for a *second* unrelated required top-level string (Supplier has `email` + optional `phone`; Category has `name` + optional `description`). Trivial — one more `space-y-2` block, no new mechanism. | — |
| `year: number, min 1950` | One-sided bounded number, single-message convention | `book.ts:20,25` (`pages` min 1), `warehouse.ts:26,40` (`capacity` min 0) |
| `electric: boolean, default false` | **Not** the Book/Category/Coupon `default true` idiom — mirrors Review's `verified`, incl. `defaultValues: { electric: false }` and `field.value ?? false` | `review.ts:39-41`, `review-form.tsx:64,162` |
| *(no optional field)* | First T1 entity with **zero** optional fields — the `'' → undefined` idiom is simply absent | — |
| *(no date field)* | First T1 entity with **no date at all** | `src/shared/domain/iso-date.ts` |

**Exists — pure recombination.** The batch's zero-risk module.

### 2.2 Invoice — relation combobox over Suppliers (`supplierId`, numeric)

**Established plumbing, one real deviation.** The RELATION mechanism is proven
exactly once, by Review→Books:

- `BookCombobox` (`book-combobox.tsx:1-88`): `Popover`+`Command`, queries
  `useBooksList({ q, pageSize: 10 })` (`:13,34`), options `` `${title} (${isbn})` ``
  (`:79`). Free typing sets the field value on every keystroke (`:42-45`), so an
  invented value lands in the field and fails validation instead of being
  silently discarded.
- Async refinement: `reviewUpsertSchema.superRefine(async …)` calling
  `booksApi.get`, `ctx.addIssue({ path: ['bookIsbn'] })` (`review-form.tsx:33-44`).
  `zodResolver` awaits `parseAsync`, so it surfaces as a normal RHF field error,
  never a toast (`:23-31`).
- Server-side second line of defence: `bookExists(isbn)` exported from the
  *owning* domain (`books.mock.ts:41-43`), called from the *relying* domain's
  `validateUpsert` (`reviews.mock.ts:9,48`). This cross-domain export was added
  during batch-1 VERIFY (`plans/batch-1.md:339-341`) and is now the declared
  shape to reuse, not reinvent.

**The deviation:** `bookIsbn` is a `string` and free-typed text is assigned
as-is (`onChange(text)`, `book-combobox.tsx:44`); `supplierId` is a `number`, so
the props' types and the free-typing path need an explicit coercion decision.
Not covered by the precedent — resolved by me in §1.2(a); the mechanic does not
choose it.

Everything else transfers unchanged: `suppliersApi.get(supplierId)` (numeric
param, already the shape `crud-api`/`crud-hooks` generate for
`keyType: 'number'`), the `addIssue` shape, and numeric route params
(`crud-routes/helper.ts:59`, exercised by Authors/Reviews/Suppliers,
`suppliers.mock.ts:64,91`).

Repetition ahead: relation-combobox instance **#2 of 2** in the whole schedule —
nothing later relates. Do **not** extract a schematic from two instances that
differ in key type (directive rule 1 needs 3+).

### 2.3 Invoice — embedded `billing` vs Warehouse `location` (the declared rule)

Warehouse's embedded object is batch 2's declared rule
(`plans/batch-2.md:262-268,331`), proven and green: `locationSchema`
(`warehouse.ts:22-33`), nested at `:41`; `FieldSet`+`FieldLegend`
(`warehouse-form.tsx:92-93`) with the flat per-field idiom unchanged inside
(`:110-121`) and nested error reads (`:113,116`); `validateLocation` walking
`body.location` per nested field (`warehouses.mock.ts:47-70`); PATCH replaces the
whole embedded object as a value, never a field-by-field merge (`:139-144`);
detail page renders it as its own labelled `<dl>` block
(`warehouse-detail-page.tsx:95-116`).

**Invoice's `billing` is a strict subset, not a deviation**: three fields, all
plain required strings, so none of Warehouse's bounded-number single-message
handling is needed. Everything else reuses the shape verbatim.

Repetition: embedded-object instance **#2 of 3** (Shipment `destination` is #3,
batch 4). Extraction becomes evaluable at batch 4 with the third instance in
hand — as `plans/batch-2.md:479` already flagged.

**Hazard:** `plans/batch-2.md:458-462` records the Playwright strict-mode
collision on `getByLabel('City')` substring-matching "Capa**city**", and
explicitly warns it applies to Invoice's `billing.city`. Pre-authorised:
`{ exact: true }` on every `getByLabel`/`getByText` in `e2e/invoices.spec.ts`
that targets a short label contained in a longer one (`City`, `Paid`, `Total`).

### 2.4 Invoice — inline row-action switch on the Paid column

**No precedent anywhere for a row-level mutation.** Every `Switch` in the tree is
either a form field bound via `Controller` (`author-form.tsx:107`,
`book-form.tsx:108`, `coupon-form.tsx:99`, `category-form.tsx:92`,
`review-form.tsx:162`) or the one list-level **filter** toggle
(`reviews-page.tsx:114-123`), which writes to the URL and calls no mutation. No
list page calls `useUpdate<Singular>` from inside a table body.

The closest existing row-level *mutation* is row-menu delete, identical across
all 7 modules (`authors-page.tsx:177-182` trigger → `AlertDialog` → `:49-56`
`mutate(id, { onSuccess: toast.success, onError: toast.error(error.message),
onSettled: … })`). **State preservation is structural**: delete never touches
`page`/`q`; the generated `onSuccess` invalidates the list keys and the refetch
runs against the same URL-derived key, so there is nothing to restore.

**New for Invoice:** an *instant* mutation from a row control — no confirmation
dialog, own pending/disabled state, failure toast, and the invalidate-driven
snap-back. It composes two proven pieces into a shape neither proves alone.

Repetition ahead: 4 more instant-row-mutation shapes (Shipment bulk PATCH,
Ticket Close/Reopen, Subscription Renew, Event publish) — but each with a
*different trigger control* (checkbox bar / menu item / detail button). Declare
the narrow rule (instant single-row PATCH + invalidate + failure toast, no
dialog) and leave the trigger per entity; do not generalise into one schematic
across visually different triggers.

### 2.5 Invoice + Payment — currency

**Confirmed absent**: `grep -rn "Intl|toFixed|currency|USD" src/ mocks/` returns
zero hits. New mechanism, 2 instances total (both in this batch), none later.
`src/shared/domain/iso-date.ts` is the established precedent for *where* a small
cross-cutting value module lives and how it is shared. Resolved in §1.4.1.

### 2.6 Payment — enum `method` in a FORM Select

**No precedent for an enum FORM field.** The only wired `Select` is Coupon's
list-toolbar filter (`coupons-page.tsx:114-131`) — URL-driven, never inside a
`<form>`, never validated by Zod, never bound via `Controller`.
`src/components/ui/select.tsx` has exactly one importer today. Radix `Select` is
proven drivable in jsdom against `src/test/setup.ts:25-28`
(`plans/batch-2.md:471-473`) — no contingency needed. What is new is only the
combination `Controller` + `Select`; both halves are proven. Zod-side,
`z.enum([...])` is already used at `src/routes/coupons/index.tsx:12` (a search
schema rather than an entity schema — same call shape, different home).

### 2.7 Payment — enum list filter

**Plumbing and control both fully proven via Coupon — a pure mirror.** Chain to
replicate: route `validateSearch` enum line (`src/routes/coupons/index.tsx:12`,
riding the `extraSearch` input — `crud-routes/helper.ts:10-16`); page wiring
(`coupons-page.tsx:48-58` filters forwarding, `:114-131` the Select,
`replace: true` per `plans/batch-2.md:467`); mock application before pagination
(`coupons.mock.ts:39-43,70-77`, per the convention documented at
`mocks/core/list-query.ts:9-16`).

Instance **#3 of 3** in the schedule (Coupon #1, Payment #2, Event #3 in batch
4) — i.e. only **one** repeat remains after this batch. See §3 for the
extraction verdict.

### 2.8 Payment — conditional-required `processedAt` (create AND edit)

**Genuinely new, and structurally different from Coupon's rule, not an extension
of it.** Coupon's (`coupon.ts:58-67`) is *create-only* (two schemas selected once
at mount, `coupon-form.tsx:36`) and *self-referential* (compares `expiresAt`
against `todayIso()`). Payment's applies on **both** sides — so one schema, no
selection logic — and is **truly cross-field**, firing on a *sibling field's
value*. No `superRefine` in the tree reads one field to decide whether another
is required.

What transfers: the `ctx.addIssue({ code: 'custom', path: […], message })` shape
and the "mock re-checks independently" idiom — but the mock check must run on
**both** POST and PATCH, unlike Coupon's deliberate POST-only asymmetry
(`coupons.mock.ts:128-130`). Repeats exactly once more (Shipment
`shippedAt`/`delivered`, batch 4) → first instance, declare the rule.

### 2.9 Optional date + conditional requirement

Two proven pieces compose into an unproven third: `optionalIsoDateSchema`
(`iso-date.ts:24`, used today only by Book's `publishedAt`, which carries no
conditional) and the `'' → undefined` `setValueAs` idiom
(`book-form.tsx:91-94`), which runs at the RHF level *before* `zodResolver`.
Because of that ordering, the refinement always sees a clean `undefined` (never
`''`), so the two compose without friction. No new primitive is needed — Payment
is simply the first entity to need both at once.

### 2.10 Schematic coverage check

All 8 schematics re-read in full. **None needs extension or a sibling for the
work batch 3 hands them:**

- `crud-api` / `crud-hooks` — parameterised only by
  `singular, plural, keyField, keyType`; a fixed template with name
  substitution (`crud-api/helper.ts:20-42`, `crud-hooks/helper.ts:19-70`) that
  never looks at the entity's other fields. **Invoice's numeric key + relation +
  embedded object do not touch them at all** — relations and embedded objects
  live in the domain schema and presentation layer. Byte-identity holds.
- `crud-routes` — `extraSearch` (`crud-routes/helper.ts:10-16`) absorbs
  Payment's `?method` enum exactly as it absorbed Coupon's `?status`: a raw Zod
  line, no schematic change. Numeric-key routing (`Number(...)`, `helper.ts:59`)
  is already proven by Authors/Reviews/Suppliers, so Invoice's numeric key needs
  nothing new.
- `mock-route-keys`, `mock-domain-register`, `sidebar-nav-entry`,
  `overview-card` — pure additive, idempotent text edits, unaffected by field
  shape.
- `crud-module` — composition order (generate layers, then register,
  `crud-module/factory.ts:24-31`) still holds for all three entities.

(What batch 3 *adds* to the schematic set is a separate question, answered in
§2.11b and §3 — the deferred create/edit-page decision, not a shortfall in any
existing schematic.)

### 2.11 The deferred decisions batch 1 and 2 carried forward — resolved

**(a) Mock domain factory + fixture.** The one byte-identical sub-shape is
already extracted as runtime code (`mocks/core/list-query.ts`, used by all 7
domains). What remains genuinely varies per entity, confirmed across all 7:
`validateUpsert` body (3 checks for Books, 4 + nested walk for Warehouses, 5
incl. a relation check for Reviews), the `q` predicate and which fields it
touches (`books.mock.ts:64-68` two fields, `suppliers.mock.ts:49-56` three incl.
an optional, `warehouses.mock.ts:88-95` three incl. a nested), sort key and
comparator, uniqueness count (1 field vs Suppliers' 2, `:36-40,76,99`), extra
filters layered on `parseListQuery` (`reviews.mock.ts:38-41`,
`coupons.mock.ts:40-43`), and relation/nested validation
(`reviews.mock.ts:48`, `warehouses.mock.ts:47-70`). **Invoice adds a fourth kind
of variation in a single entity** — numeric key *and* cross-domain relation
*and* embedded object. Generating that needs the "kind of entity" switch the
directive forbids. **Verdict: defer again; nothing further to extract.**

**(b) List page / form / create-edit-detail pages — the scheduled decision.**
Compared across Authors, Reviews, Coupons, Warehouses (with Books/Categories/
Suppliers spot-checked):

- **`<singular>-create-page.tsx` — near-byte-identical, zero bespoke logic.**
  All instances share one line-for-line structure (imports, `useNavigate` +
  `useCreate<X>()`, breadcrumb, `<h1>New <entity></h1>`, `<XForm submitLabel …
  serverError={… instanceof ApiError …} onSubmit={… mutate(values, { onSuccess:
  toast + navigate }) } onCancel={…} />`). Variation points: name substitution,
  and **one** identifying field in the success toast (`fullName` / `code` /
  `name` / `reviewId`). **Schematic-ready as-is.**
- **`<singular>-edit-page.tsx` — near-byte-identical.** Same three-way
  `isError`/`isPending`/loaded branch with an identical 4-row skeleton block,
  conditional `<h1>`, then the form with an `onSuccess` that navigates to the
  detail route. Variation points: name substitution, key field name/type (the
  `String(key)` param cast for numeric keys — the same `keyValueExpr` split
  `crud-routes/helper.ts:59` already models), the identifying field, and the
  not-found message string. **Schematic-ready as-is.**
- **`<singular>-detail-page.tsx` — identical *chrome*, bespoke *body*.** The
  breadcrumb, three-way branch, Edit/Delete pair, `AlertDialog` block
  (`author-detail-page.tsx:106-125` ≡ `coupon-detail-page.tsx:108-127`) and
  skeletons are invariant; the `<dl>` field list is a hand-written enumeration
  of that entity's fields, which already breaks on embedded objects
  (`warehouse-detail-page.tsx:95-116`) and relation links
  (`review-detail-page.tsx:28-35,106-109`). A generator would need a field-list
  DSL — the master generator the directive forbids. **Not extractable.**
- **`<plural>-page.tsx` — identical *chrome*, bespoke columns/filters/actions.**
  Search box, pagination footer, four-way state branch, row menu and delete
  dialog are invariant; the `TableHead`/`TableCell` set, any filter control and
  (new this batch) Invoice's inline switch cell are not. Same verdict, same
  reason.
- **`<singular>-form.tsx` — bespoke by construction.** The skeleton is stable
  but the field set *is* the entity specification (AGENTS.md: "Zod schemas are
  the single source of truth"). **Permanently deferred**, as both prior plans
  concluded.

### 2.12 `mocks/core/` and `src/shared/` — what batch 3 touches

- `mocks/core/types.ts` — `MockRouteKey` at **35** literals (`:14-49`); batch 3
  adds 15 → **50**, purely additive via the unchanged `mock-route-keys`.
- `mocks/core/list-query.ts` — reused as-is by all three; entity filters stay
  local one-liners layered on top (`:9-16`).
- `src/shared/api/pagination.ts` — `ListParams.filters` (`:9-18`) absorbs
  Payment's `method` with **zero** changes.
- `src/shared/domain/iso-date.ts` — reused as-is (Invoice `issuedAt` required,
  Payment `processedAt` optional).
- **One genuine shared addition**: currency formatting (§2.5, §1.4.1).
- `src/components/ui/` — nothing to generate; `select`, `switch`, `field`,
  `command`, `popover` all exist and are wired.

### 2.13 Hazards carried forward

1. **Playwright strict-mode locator collisions** — recorded twice
   (`plans/batch-1.md:335-338`, `plans/batch-2.md:458-462`). Applies to
   Invoice's `billing.city`. `{ exact: true }` is pre-authorised from the start
   in all three e2e specs.
2. **Detail-page refetch shows the skeleton first** (`plans/batch-2.md:454-457`)
   — any section test that edits and then asserts on the detail page must use
   `findBy*`, never `getBy*`.
3. **jsdom Radix `Select` is proven drivable** — no test-setup change is
   authorised for Payment's two Selects.

---

## 3. Schematic decisions

Directive: extract from proven code, bottom-up, one schematic per atomic
pattern, composites only from proven pieces, never a master generator.

| Pattern | Established? | Action | Rationale (proven instance · repetitions · variation points) |
|---|---|---|---|
| Module skeleton (api + hooks + routes + 4 registrations) | ✅ proven ×6 through batch 2 | **use** `default:crud-module` ×3 | 8 repeats ahead. Payment's only deviation is the `extraSearch` input value. Nothing generated is hand-patched. |
| List-route extra search entries | ✅ `extraSearch`, proven on Review + Coupon | **use as-is** | Payment is the third user of a variation point that already takes raw Zod lines. |
| **Create page** (`<singular>-create-page.tsx`) | ✅ **7 proven instances, byte-identical modulo names** (§2.11b) | **extract** → `default:crud-create-page` | Directive rule 1 exactly: proven implementation + 8 repeats ahead (3 this batch, 5 in batches 4–5). Variation points: `singular`, `plural`, `labelField` (the identifying field in the success toast). Zero bespoke logic in any of the 7. |
| **Edit page** (`<singular>-edit-page.tsx`) | ✅ **7 proven instances, byte-identical modulo names** (§2.11b) | **extract** → `default:crud-edit-page` | Same evidence, same 8 repeats. Variation points: `singular`, `plural`, `keyField`, `keyType` (the `String(key)` param cast, already modelled by `crud-routes/helper.ts:59`), `labelField`. |
| ↳ composite | — | **extend** `default:crud-module` to compose the two new helpers (+ one new `labelField` input) | The composite is only ever assembled from pieces already proven in isolation: the two atomics are authored with `bun test` coverage **and** executed for real on Vehicle *before* `crud-module` is extended (§4, X2 → S2). No edit logic or template moves into the composite. |
| Detail page / list page | ✅ 7 instances, chrome only | **none — decided, not deferred again** | Chrome is invariant but the `<dl>` body and the `TableHead`/`TableCell` set are the entity itself; both already break on embedded objects, relation links and (new this batch) an inline mutation cell. A chrome-with-body-slot generator is the master generator the directive's granularity rule forbids. This closes the question batch 1 and 2 deferred to batch 3 — the answer is **no**, with evidence, rather than another deferral. |
| Form | ✅ 7 instances | **none — permanent** | The field set *is* the per-entity specification. |
| Mock domain factory + fixture | ✅ 7 instances | **defer** (unchanged verdict, §2.11a) | Still needs a "kind of entity" switch; Invoice makes that worse, not better. Its one byte-identical sub-shape is already `mocks/core/list-query.ts`. |
| Enum Select list filter | ✅ first instance is Coupon (proven) | **none** | After Payment lands, exactly **one** repeat remains in the whole schedule (Event, batch 4). Directive rule 1 requires 3+ repeats *ahead*; one does not qualify. Keep mirroring the declared rule by hand. |
| Embedded-object fieldset | ✅ Warehouse (declared rule, batch 2) | **use the rule by hand** | Invoice is instance #2; Shipment (#3) lands in batch 4 — extraction becomes evaluable there, not here. |
| Relation combobox | ✅ Review (batch 1) | **none** | Instance #2 of 2 in the whole schedule, and the two differ in key type. |
| Currency formatting | ❌ new | **shared function, not a schematic** → `src/shared/format/currency.ts` | 2 textually identical uses, both in this batch. Same crystallisation call as `mocks/core/list-query.ts` in batch 2: DRY beats generating two copies. |
| Sibling-driven conditional required field | ❌ first instance is Payment | **new pattern, built by hand — declared the rule** (directive rule 2) | 1 repeat ahead (Shipment, batch 4). Proven-first, extractable later if a third ever appears. |
| Inline single-row PATCH action | ❌ first instance is Invoice | **new pattern, built by hand — declared the rule, narrowly** | 4 shapes ahead but with different trigger controls. The declared rule is the *core* (instant `mutate` + invalidate + failure toast, no dialog, no navigation), not the control. |
| Section tests / e2e specs | ✅ 7 instances | **none — permanent** | Assertions are field- and quirk-specific. |
| Domain Zod schema | ✅ 7 instances | **none** | It *is* the per-entity specification. |

Granularity rule applied: the two new schematics are one atomic file type each,
neither takes a "kind of entity" switch, and the composite gains composition
only — no inline edits or templates. The 7 existing modules are **not**
retrofitted through the new schematics: they are already green and already
byte-identical, so a regeneration pass would be churn with no gate benefit.

---

## 4. Delegation plan

Every delegation is a blocking `mechanic` call carrying: the exact files, the
reference pattern to mirror, the entity's spec lines from
`entities-benchmark.txt`, and the tests it must include. I review each delivery
against this plan before the next step. Design decisions stay in this file.

| # | Unit | Depends on | Delegate |
|---|---|---|---|
| **W1** | Shared prep: `src/shared/format/currency.ts` (`formatUsd`) + `supplierExists()` added to `mocks/domains/suppliers.mock.ts` with one new case in its mock spec. Gates stay green. | — | mechanic |
| **S1** | Author the two new atomic schematics `crud-create-page` and `crud-edit-page` (scaffold with `builder new schematic`, real `schema.json` + `pbuilder-codegen`, factory delegating to a co-located `helper.ts`, `*.test.ts` via `runFactoryForTest`), each byte-compared in its test against the Authors (numeric key) **and** Coupons (string key) originals. | — | mechanic |
| **X1** | I run `builder execute default:crud-module` **standalone, one shell call** for `vehicles`, and read every file it wrote/edited. | S1 not required | me |
| **X2** | I run `default:crud-create-page` and `default:crud-edit-page` standalone for `vehicles` (2 shell calls) and diff the output against `author-*`/`coupon-*` — this is the "proven for real" step the composite is allowed to build on. | S1, X1 | me |
| **S2** | Extend the `crud-module` composite to also compose `generateCrudCreatePage`/`generateCrudEditPage` (new `labelField` input, `schema.json` + codegen + test update). No edit logic moves inline. | X2 green | mechanic |
| **X3** | I run the extended `default:crud-module` standalone for `invoices` then `payments` (2 shell calls; Payment carries the `extraSearch` `method` line), and review the output. | S2 | me |
| **M1** | Vehicle module: fixture (24 rows, 8 electric), mock + spec, domain schema, list/form/detail pages + `electric-badge.tsx`, 2 section tests, `e2e/vehicles.spec.ts`. | X3 | mechanic |
| **M2** | Invoice module + all quirks: relation combobox (numeric coercion per §1.2a), async existence refinement, embedded `billing` fieldset, inline Paid switch, currency; mock with the relation check, nested validation and numeric key; tests per quirk. | X3, W1 | mechanic |
| **M3** | Payment module + all quirks: conditional `processedAt` on both sides, enum Select in the form, `?method` filter applied by the endpoint, currency; tests per quirk. | X3, W1 | mechanic |
| **V** | Gates, diagnosis, fixes (mechanical fixes re-delegated). | all | me |

W1 and S1 touch disjoint files and run **in parallel in one message**, each
blocking. M1, M2 and M3 touch disjoint file sets (their own
`src/features/<plural>/**`, `mocks/{fixtures,domains}/<plural>*`,
`e2e/<plural>.spec.ts`) because X1/X3 have already made every shared edit, so
all three run **in parallel in one message**, each blocking.

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

**Vehicle (T1)** — plus: `year` below 1950 is a field error carrying
`YEAR_MESSAGE` (not "received NaN"); the list renders **Electric** for an
electric fixture row and **Combustion** for a combustion one; a created vehicle
defaults `electric` to `false` when the switch is untouched (mock spec + form
section test).

**Invoice (T2)** — plus one test per quirk:

- (a) selecting a supplier from the combobox fills `supplierId` and the option
  label reads `name (id)` (section); a free-typed unknown id produces a **field
  error** on the Supplier field (`Supplier "<id>" does not exist`) and does not
  navigate (section); the mock independently rejects an unknown `supplierId`
  with 400 on POST **and** on PATCH (mock spec); `supplierExists` is exported and
  covered in `suppliers.mock.spec.ts` (W1).
- (b) toggling a row's Paid switch PATCHes that invoice and the row reflects the
  new value **while the list stays on the same page and keeps its search text**
  (section: navigate to `/invoices?page=2&q=…`, toggle, assert the URL and the
  visible rows are unchanged apart from the toggled value); a failing PATCH
  raises a toast and the row reverts (section, via a one-off MSW error override).
- (c) `total` renders as `$1,234.50` in the list **and** on the detail page
  (section) — never a bare number.
- embedded: submitting the empty form shows a message under **each** nested
  billing field (street, city, zipCode) inside a fieldset with the accessible
  name "Billing" (section); the mock rejects a nested violation with 400 (mock
  spec); `q` matches on `billing.city` (mock spec + section).

**Payment (T2)** — plus one test per quirk:

- (a) submitting with `confirmed` on and `processedAt` empty shows the field
  error under Processed and does **not** navigate — on the **create** form *and*
  on the **edit** form (two section cases); the same payload is rejected by the
  mock with 400 on POST **and** on PATCH (mock spec); leaving `confirmed` off
  with an empty `processedAt` is valid (section).
- (b) `amount` renders as `$…` with 2 decimals in the list and on the detail
  page (section).
- (c) `?method=card` returns only the 9 card rows and `?method=cash` only the 7
  cash ones, endpoint-applied so `total` reflects the filtered set (mock spec);
  choosing "Transfer" in the toolbar Select writes `?method=transfer`, resets
  `page` to 1 and keeps `q` (section); e2e drives the Select click-through.
- enum form field: the Method Select is drivable and its chosen value round-trips
  through create (section); the list renders the **label** (`Card`), never the
  raw enum value.

**Schematics** — `pnpm test:schematics` green, including the two new
schematics' own tests (byte-comparison against the Authors and Coupons
originals, plus a second run proving idempotence where an edit is involved) and
the updated `crud-module` composite test.

**Batch gates** — run by me, in the foreground, until all green:

```bash
pnpm typecheck && pnpm lint && pnpm test:run && pnpm test:e2e
```

Expected end state: 10 sidebar entries + 10 overview cards, `MockRouteKey` at 50
literals, 3 new mock domains reset in the shared `afterEach`, 10 e2e specs, 10
schematics registered in `project-builder.json`, one new shared module
(`src/shared/format/currency.ts`), one added export in
`mocks/domains/suppliers.mock.ts`, and the seven earlier modules otherwise
untouched and still green.

---

## 6. Outcome (batch closed)

All four gates green in one chain, run in the foreground by the orchestrator:

| Gate | Result |
|---|---|
| `pnpm typecheck` | ✅ exit 0 |
| `pnpm lint` | ✅ exit 0 |
| `pnpm test:run` | ✅ 32 files / 242 tests (was 23 / 160) |
| `pnpm test:e2e` | ✅ 75 passed (was 52) |
| `pnpm test:schematics` | ✅ 36 tests / 10 files (was 28 / 8) |

End state matches §5's expectation exactly: **50** `MockRouteKey` literals, 10
sidebar entries + 10 overview cards, 10 mock domains all reset in the shared
`afterEach`, 10 e2e specs, **10 schematics** registered, one new shared module
(`src/shared/format/currency.ts`), one added export in
`mocks/domains/suppliers.mock.ts`, and the seven earlier modules otherwise
untouched and still green.

Build sequence as planned: W1 + S1 in parallel → X1 (`crud-module` for
`vehicles`) → X2 (the two new atomics run standalone for `vehicles`, output
diffed against the Coupons references — **byte-identical modulo names**, which is
what licensed extending the composite) → S2 (composite extended) → X3 (extended
`crud-module` for `invoices` and `payments`, which generated their create/edit
pages too) → M1/M2/M3 in parallel → VERIFY. Every `builder execute` ran
standalone, one per shell call, per the pbuilder guardrail.

The directive's lifecycle worked as written: rule 1 fired for the create/edit
pages (proven ×7, 8 repeats ahead → extract, then generate the repeats with
them), and rule 2 for the two genuinely new mechanisms (sibling-driven
conditional, inline row PATCH), which were built by hand and declared the rule.
No schematic needed a post-generation patch: Payment's `?method` filter rode the
existing `extraSearch` variation point as a declared input.

Deviations from the plan, and fixes applied during VERIFY:

- `e2e/invoices.spec.ts` failed once on the Paid-switch case: it asserted
  `toHaveURL(/\/invoices$/)`, but TanStack Router writes the list route's search
  **defaults** into the URL on load, so the real URL is `/invoices?page=1&q=`
  and the pattern could never match — before or after the toggle. Fixed in place
  by me: capture `page.url()` before the click and assert it is byte-identical
  after, which is a stricter statement of the actual requirement ("the row must
  not lose its page/search state"). No source change. **New hazard for batch 4:
  never assert a bare path against a list route with `toHaveURL`.**
- `payment-form.tsx` emitted a React "Select is changing from uncontrolled to
  controlled" warning (visible in the e2e web-server console, not a gate
  failure): `method` has no default, so the create form's Select mounted with
  `value={undefined}` and flipped on first selection. Fixed by me with
  `value={field.value ?? ''}` — the same idiom the boolean fields already use
  (`field.value ?? false`) — with a comment. Re-verified: warning gone, all
  gates still green.
- Mechanic-level choices inside the specified design, accepted on review:
  Invoice's detail page resolves the relation through a small
  `InvoiceSupplierLink` mirroring `ReviewBookLink` (the plan specified the list
  column only) and renders `paid` as plain text, since the inline switch is
  scoped to the list; `SUPPLIER_MESSAGE = 'Select a supplier'` as the base
  `z.number()` message covers both the `undefined` and the `NaN` case in one
  string, matching the bounded-number convention; Vehicle's detail page uses
  plain "Electric"/"Combustion" text in the `<dl>` while the badge component
  serves the list column, mirroring how Book treats `inPrint`.
- Vehicle's form section test searches for the newly-created plate before
  asserting on it: the created row sorts onto page 3, so a post-create list
  assertion on page 1 would never find it. Test-only, no source change.
- Payment's fixture exceeds its floor: 9 unconfirmed rows carry no
  `processedAt` (4 required), and one unconfirmed row deliberately keeps a
  `processedAt` to prove the field is optional-not-forbidden when unconfirmed.

Carried forward to the next plan:

- **`crud-create-page` and `crud-edit-page` are proven and composed into
  `crud-module`.** Every entity from batch 4 on gets both presentation pages
  generated; the composite now takes a `labelField` input. The seven pre-batch-3
  modules were deliberately NOT retrofitted through them (already green, already
  byte-identical — regeneration would be churn with no gate benefit).
- **Embedded-object fieldset** — Invoice was instance #2. Shipment
  `destination` (batch 4) is #3, the point at which extraction becomes
  evaluable under directive rule 1.
- **Sibling-field-driven conditional** (Payment `processedAt`/`confirmed`) is
  the declared rule for Shipment's `shippedAt`/`delivered`; mirror
  `paymentFormSchema` and the mock's both-verbs check.
- **Inline single-row PATCH** (Invoice's Paid switch) is the declared rule,
  narrowly: instant `mutate` + invalidate + failure toast, no dialog, no
  navigation. The trigger control stays a per-entity choice (Ticket's row menu,
  Shipment's bulk bar, Subscription's Renew item).
- **Enum Select list filter** — Payment was #2; only Event remains, so it stays
  hand-built from Coupon's declared rule rather than being extracted.
- **Mock domain factory + fixture** — still deferred; Invoice (numeric key +
  relation + embedded, all in one entity) made the "kind of entity" switch worse,
  not better.
- **List page / detail page / form** — **decided, not deferred again**: not
  extractable, with the evidence in §2.11(b). This closes the question batch 1
  and batch 2 scheduled for batch 3.
