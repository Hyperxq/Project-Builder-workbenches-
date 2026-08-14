# Batch 3 — Vehicle [T1], Invoice [T2], Payment [T2]

Orchestrator plan per `HARNESS.md`. Authority on architecture/patterns is `AGENTS.md`;
design language is `DESIGN.md`. Reference module: **Author** (`src/features/authors/**`,
`mocks/domains/authors.mock.ts`, `src/routes/authors/**`, `e2e/authors.spec.ts`).
Closest precedents for this batch's quirks: **Review** (batch 1 — relation combobox,
false-defaulting boolean), **Coupon** (batch 2 — refined schema factory, enum URL filter
+ toolbar `Select`), **Warehouse** (batch 2 — embedded object).

Baseline confirmed green before any change (orchestrator, foreground):
`pnpm typecheck` · `pnpm lint` · `pnpm test:run` (21 files / 156 tests).

`plan-directives/` does not exist — no external directives to incorporate.

---

## 1. Modules

### 1.1 Vehicle — Tier T1

Fields (`entities-benchmark.txt:63-68`): `plate: string, required, unique` ·
`brand: string, required` · `model: string, required` · `year: number, required, min 1950` ·
`electric: boolean, required, default false`.

| File | Mirrors |
|---|---|
| `mocks/core/types.ts` (+5 keys `LIST_VEHICLES`…`DELETE_VEHICLE`) | existing union, append after `DELETE_WAREHOUSE` (`:49`) |
| `mocks/fixtures/vehicles.fixture.ts` (24 rows) | `books.fixture.ts` |
| `mocks/domains/vehicles.mock.ts` (+ `resetVehicles`) | `books.mock.ts` (string key) |
| `mocks/domains/vehicles.mock.spec.ts` | `books.mock.spec.ts` |
| `mocks/handlers.ts` (`:5-11` import, `:31-38` spread) · `mocks/setup-test-mocking.ts` (`:4-10`, `:39-47`) | existing |
| `src/features/vehicles/domain/vehicle.ts` | `domain/book.ts` |
| `src/features/vehicles/infrastructure/vehicles.api.ts` | `infrastructure/books.api.ts` |
| `src/features/vehicles/application/use-vehicles.ts` | `application/use-books.ts` |
| `src/features/vehicles/presentation/vehicles-page.tsx` | `books-page.tsx` |
| `…/vehicle-form.tsx` · `…-create-page.tsx` · `…-edit-page.tsx` · `…-detail-page.tsx` | Book equivalents |
| `…/electric-badge.tsx` | `in-print-badge.tsx` / `verified-badge.tsx` |
| `…/vehicles-page.test.tsx` · `…/vehicle-form.test.tsx` | Book equivalents |
| `src/routes/vehicles/{index,new}.tsx`, `src/routes/vehicles/$plate/{index,edit}.tsx` | `src/routes/books/**` (string param — **no `Number(...)` cast**) |
| `src/app/shell/app-sidebar.tsx` (one NAV line) · `src/routes/index.tsx` (one card) | existing |
| `e2e/vehicles.spec.ts` | `e2e/books.spec.ts` |

### 1.2 Invoice — Tier T2

Fields (`entities-benchmark.txt:114-132`): `invoiceNumber: number, required, unique` ·
`supplierId: number, required` → RELATION · `total: number, required, > 0` ·
`issuedAt: date, required` · `paid: boolean, required, default false` ·
`billing: embedded, required { street, city, zipCode — all string, required }`.
Quirks: (a) relation via async combobox over suppliers, (b) inline Paid switch in the
list row, (c) `total` as USD currency in list + detail.

Same file list with `invoices`/`invoice`, key param `$invoiceNumber` (numeric — the route
component casts with `Number(...)` exactly like `src/routes/reviews/$reviewId/index.tsx:10`),
**plus**:

- `src/shared/lib/currency.ts` — shared USD formatter (orchestrator-owned, §3.0)
- no new shared component: the relation reuses `src/shared/components/relation-combobox.tsx`
  unchanged (§3.2), the embedded group reuses `FieldSet`/`FieldLegend` (§3.4)
- no badge component: `paid` is rendered by the inline `Switch` in the list (quirk b) and
  as plain text on the detail page

### 1.3 Payment — Tier T2

Fields (`entities-benchmark.txt:150-160`): `paymentId: number, required, unique` ·
`amount: number, required, > 0` · `method: enum(card | transfer | cash), required` ·
`processedAt: date, optional*` · `confirmed: boolean, required, default false`.
Quirks: (a) `processedAt` REQUIRED when `confirmed = true`, (b) `amount` as USD currency
in list + detail, (c) `?method` list filter (All | Card | Transfer | Cash), URL-driven,
applied by the list endpoint.

Same file list with `payments`/`payment`, key param `$paymentId` (numeric cast), **plus**:

- `src/features/payments/presentation/confirmed-badge.tsx` (list Confirmed column)
- the method `Select` filter is inlined in `payments-page.tsx` (quirk c), mirroring
  `coupons-page.tsx:109-123`
- the form's method `Select` lives inside `payment-form.tsx` (§3.6)

---

## 2. Pattern inventory (scout report, incorporated)

The `scout` sub-agent ran read-only over `AGENTS.md`, `DESIGN.md`, `entities-benchmark.txt`,
both prior plans, every feature module, every mock domain, `src/shared/**`,
`src/components/ui/**`, `src/test/**`, `e2e/**` and the configs. Summary of its findings,
with the evidence it cited:

### Vehicle — EXISTS, 100 % mirror, zero new design surface

- **String unique key** (`plate`): 5th occurrence — Book `isbn` (`src/features/books/domain/book.ts:14,31-33`),
  Category/Coupon/Warehouse `code`. Route param stays a string.
- **Two plain required strings** (`brand`, `model`) = Book's `title` (`book.ts:15`).
- **Single-sided numeric min** (`year ≥ 1950`) = Book's `pages ≥ 1` (`book.ts:16`) with a
  different bound and no upper cap (unlike Coupon's two-sided `discount`).
- **Boolean defaulting FALSE**: one precedent, Review's `verified`. It is exactly three
  sites: form `defaultValues: review ?? { verified: false, … }`
  (`review-form.tsx:42`), `Switch checked={field.value ?? false}` (`review-form.tsx:174`),
  mock `verified: body.verified ?? false` (`reviews.mock.ts:127`) — versus Author's `?? true`
  at the same three sites. Flip all three; do not reflexively copy Author.
- **Badge** is an entity-local file (4 precedents: `active-badge.tsx`, `in-print-badge.tsx`,
  `enabled-badge.tsx`, `verified-badge.tsx`), all `Badge variant="outline"` + a
  `size-1.5 rounded-full` dot + label. `electric-badge.tsx` is the 5th copy.

Repetition ahead: string key → Shipment `trackingCode`, Event `slug` (2); false-defaulting
boolean → Shipment `delivered`, Event `published`, Employee `remote` (3).

### Invoice — base CRUD + embedded EXIST; three items are genuinely new

- **Numeric unique key** = `authorId`/`supplierId`/`reviewId` (`author.ts:12,29-31`). Mirror.
- **RELATION workflow EXISTS end to end**: options built from the sibling feature's
  application hook and labelled `"title (isbn)"` (`review-form.tsx:50-55`),
  `Controller`-wrapped `RelationCombobox` (`review-form.tsx:90-116`), resolve-before-submit
  with a 404 → `setError` field error and **no toast** (`review-form.tsx:60-70`), server-side
  cross-domain check via `bookExists` (`reviews.mock.ts:5,120,145`). Batch 2 already shipped
  the producer side for this batch: `supplierExists(supplierId)`
  (`mocks/domains/suppliers.mock.ts:27-33`) and a `q` that includes
  `String(s.supplierId).includes(q)` (`suppliers.mock.ts:67-74`).
  **Deviation**: `RelationCombobox` is non-generic and hardcoded to `string`
  (`relation-combobox.tsx:30-57`: `RelationOption.key: string`, `value?: string`,
  `onChange: (value: string) => void`), while `supplierId` is a `number`. This is the one
  relation decision to make — §3.2.
- **EMBEDDED object EXISTS** as an idiom (Warehouse `location`): nested Zod object
  (`warehouse.ts:19-30`), dot-path registration + `errors.location?.city`
  (`warehouse-form.tsx:92-152`), `FieldSet`/`FieldLegend` scoped to the group only,
  nested mock validation returning one 400 per nested field and PATCH replacing the nested
  object wholesale (`warehouses.mock.ts:66-96,161-186`). `billing` is strictly simpler —
  three strings, no ranges.
- **INLINE ROW MUTATION IS NEW.** `grep -rln "useUpdate" src/features/*/presentation/*-page.tsx`
  → **no list page** uses an update mutation; only the 7 `*-edit-page.tsx` files do. Every
  `Switch` in a feature file is either a form field (5 forms) or the toolbar filter in
  `reviews-page.tsx:104-111`, which navigates rather than mutates. What *is* established is
  the guarantee the quirk depends on: list state (`page`, `q`) lives in the URL via
  `validateSearch` + `getRouteApi`, never in the query cache, so invalidating the list key
  refetches under the same params and cannot disturb the URL.
- **CURRENCY FORMATTING IS NEW.** `grep -rn "currency|NumberFormat|toFixed" src mocks` → 0
  hits; `src/shared/lib/` holds only `dates.ts`. First use is this batch (Invoice `total`,
  Payment `amount`); no later entity has a currency field.

Repetition ahead: embedded object → Shipment `destination` (1). Inline row `Switch` PATCH →
**0 exact repeats**; Ticket "Close/Reopen" and Subscription "Renew" are row-*menu* actions
sharing only the PATCH-and-invalidate plumbing. Currency → 0 after this batch.

### Payment — filter idiom EXISTS; the form `Select` and the cross-field rule are new

- **Enum URL filter**: the three-point idiom is locked by Coupon — route
  `validateSearch` enum with `.default().catch()` (`src/routes/coupons/index.tsx:15`),
  `CouponListParams extends ListParams` + `toQueryString(params, { status: … })`
  (`coupons.api.ts:6-25`, generic `extra` at `shared/api/pagination.ts:23-36`), mock parse +
  filter, toolbar `Select` with `aria-label` (`coupons-page.tsx:109-123`). 3-way → 4-way is
  one more branch, not a new shape. Radix `Select` is proven under jsdom
  (`plans/batch-2.md:419-420`).
- **Form `Select` bound to RHF is NEW as a combination.** Both halves exist —
  `Controller` (5 forms, always wrapping a `Switch`, e.g. `review-form.tsx:169-178`) and
  `Select` (only as the Coupon toolbar filter, bound to `navigate`, not to RHF) — but no
  file in the tree puts a `Select` inside a `Controller`.
- **Cross-field `.refine()` is NEW in shape, established in mechanism.**
  `grep -rn "refine|superRefine" src mocks` → only Coupon's two lines
  (`coupon.ts:52,56`). Coupon's refine is *mode*-dependent and reads one field against an
  external `today`; Payment's rule reads one field against a **sibling field in the same
  payload** and applies on create *and* edit. Same `.refine()` + explicit-return-annotation
  mechanism (`coupon.ts:54`), different condition. Mock `validateUpsert` functions are
  likewise all per-field today (`reviews.mock.ts:60-77`) — a field-depends-on-field check is
  new server-side too.

Repetition ahead: cross-field refine → Shipment `shippedAt` when `delivered` (1, structural
repeat); enum URL filter → Event `?status` (1); form `Select` → Ticket `priority` (1;
Subscription's `plan` is spec'd as *cards*, not a Select).

### Mechanical facts (from scout; binding for all delegations)

- `mocks/core/types.ts:14-49` — `MockRouteKey`, last entry `'DELETE_WAREHOUSE'`; append 5 keys
  per entity after it.
- `mocks/handlers.ts:5-11` imports · `:31-38` returned array (last: `...warehouseHandlers(config, base),`).
- `mocks/setup-test-mocking.ts:4-10` imports · `:39-47` `afterEach` (last: `resetWarehouses()`).
- `src/app/shell/app-sidebar.tsx:2-11` icon imports · `:22-31` `NAV` (last: Warehouses).
- `src/routes/index.tsx:2` icon imports · card grid, last card Warehouses.
- `PAGE_SIZE = 10` per list page; **24 fixture rows** per domain → "Page 1 of 3", parity with
  every existing module.
- `src/routeTree.gen.ts` is generated by the `tanstackRouter` vite plugin and imported by
  `src/test/render-app.tsx:4` — **run `pnpm typecheck` before `pnpm test:run` whenever routes
  change**.
- `renderApp(path)` (`src/test/render-app.tsx:11-30`) returns `{ ...result, router }`; section
  tests assert on `router.state.location.{pathname,search}`.
- `server` from `mocks/setup-test-mocking.ts` may be imported by a section test to override a
  single handler with `server.use(...)`; `afterEach` resets overrides and reseeds state.
- `.oxlintrc.json` disables `react/only-export-components` only for `src/routes/**` and
  `src/components/ui/**` — one component per file everywhere else.
- `vite.config.ts` pins `VITE_API_BASE` to an absolute URL; all infra goes through
  `shared/api/client.ts`.
- Cross-feature import rule (batch 1 §2, still binding): a feature may import another
  feature's `domain`/`infrastructure`/`application`, **never** its `presentation`.

### Traps carried forward from batches 1–2 (binding)

1. **Playwright label matching is substring-based** (`plans/batch-2.md:427-432`,
   `e2e/warehouses.spec.ts:39-41`) — applies to Invoice's `billing.city`: use
   `getByLabel('City', { exact: true })`.
2. **List sort order vs the page-1 window** (`plans/batch-2.md:434-437`) — e2e and section
   tests may only target fixture rows inside the first 10 sorted rows, or must page/search
   first. Pinned windows are fixed in §3.9.
3. **`zodResolver` cannot infer a refined schema's type** (`coupon.ts:54`,
   `plans/batch-2.md:414-417`) — Payment's refined schema needs an explicit
   `z.ZodType<PaymentUpsert, PaymentUpsert>` annotation.
4. **cmdk names its own input** via `Command`'s `label` prop
   (`relation-combobox.tsx:111-115`); Invoice inherits the fix — do not add `aria-label` to
   `CommandInput`.
5. **Serialised delegation**: every module edits the same five shared files, so mechanic
   waves run one at a time (batch 1 §, reaffirmed `plans/batch-2.md:338-343`).

---

## 3. Orchestrator design decisions (mechanics implement, never decide)

**3.0 `src/shared/lib/currency.ts` (orchestrator-owned, wave 0).** One place formats money,
mirroring how `dates.ts` centralises "today":

```ts
/** USD with exactly two decimals, e.g. 1250.5 -> "$1,250.50". */
export function formatUsd(amount: number): string
```

Implemented with `Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD',
minimumFractionDigits: 2, maximumFractionDigits: 2 })`, built once at module scope. Both
Invoice's `total` and Payment's `amount` render through it in the list **and** the detail
page — no local `toFixed` anywhere. Mocks store raw numbers; formatting is a presentation
concern only. E2E specs must not import from `src/` — they assert the literal expected
string (`"$1,250.50"`).

**3.1 Numeric money fields are NOT integers.** `total`/`amount` use
`z.number('Total is required').positive('Total must be greater than 0')` — **no `.int()`** —
and the mocks validate `typeof x === 'number' && Number.isFinite(x) && x > 0`. Form
registration is `register('total', { valueAsNumber: true })`.

**3.2 Invoice quirk (a) — the relation stays string-valued at the combobox boundary.**
`src/shared/components/relation-combobox.tsx` is **not modified and not made generic**: its
`key`/`value` are strings because cmdk's `CommandItem value` is a string, and widening it for
one consumer would push a generic through a shared presentational component for no gain.
Invoice's form adapts at the edge, inside the `Controller` for `supplierId`:

- `value={field.value === undefined ? undefined : String(field.value)}`
- `onChange={(next) => { const parsed = Number(next); field.onChange(Number.isFinite(parsed) && next.trim() !== '' ? parsed : undefined) }}`
  — non-numeric free text therefore lands as `undefined` and fails as `Supplier is required`
  rather than storing `NaN`.
- options: `useSuppliersList({ q: supplierQuery, pageSize: 10 })` →
  `{ key: String(s.supplierId), label: `${s.name} (${s.supplierId})` }` (the spec's
  "name (id)" label).
- `searchLabel="Search suppliers"`, `placeholder="Select a supplier…"`,
  `emptyMessage="No suppliers found"`, `allowFreeText` left at its default (true).
- Resolve-before-submit, exactly like `review-form.tsx:60-70`: `await suppliersApi.get(values.supplierId)`;
  on `ApiError` 404 → `setError('supplierId', { message: `No supplier with ID “${values.supplierId}”` })`
  and return. **Field error, never a toast.**
- Server side: `POST`/`PATCH` return `400 supplierId <n> does not exist` via `supplierExists`
  imported from `mocks/domains/suppliers.mock.ts` — the `bookExists` idiom
  (`reviews.mock.ts:120,145`) verbatim.

**3.3 Invoice quirk (b) — inline Paid switch: invalidate, not optimistic.** The application
layer gains one hook beside the standard five:

```ts
export function useSetInvoicePaid() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ invoiceNumber, paid }: { invoiceNumber: number; paid: boolean }) =>
      invoicesApi.update(invoiceNumber, { paid }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: invoiceKeys.all }),
  })
}
```

Rationale: invalidation is the tree's established mutation model and it *is* the mechanism
that satisfies "the row must not lose its page/search state" — `page`/`q` live in the URL, so
a refetch under the same key leaves both untouched. Optimistic updates would add rollback
machinery for no visible gain.

In the row: a `Switch` (never inside the row's `Link`) with
`aria-label={`Paid for invoice #${invoice.invoiceNumber}`}`,
`checked={invoice.paid}`, `onCheckedChange={(paid) => setPaid.mutate({ … }, { onSuccess/onError })}`,
and `disabled` while *that* row's mutation is in flight
(`setPaid.isPending && setPaid.variables?.invoiceNumber === invoice.invoiceNumber`).
Feedback: `toast.success('Invoice #1001 marked paid' | '… marked unpaid')`,
`toast.error(error.message)` on failure (the spec's required failure toast).
The Paid column header is "Paid".

**3.4 Invoice embedded `billing` follows Warehouse verbatim** (§3.6 of `plans/batch-2.md`):
`FieldSet` + `<FieldLegend variant="label">Billing</FieldLegend>` wrapping three
`<div className="space-y-2">` groups; `register('billing.street' | 'billing.city' | 'billing.zipCode')`;
errors read `errors.billing?.zipCode`; ids `billing.street` / `billing.city` / `billing.zipCode`
with labels **Street**, **City**, **Zip code**. Existing forms are not restyled. Mock side:
one 400 message per nested field (`billing.city is required`, …), and a PATCH carrying
`billing` **replaces the whole nested object** before re-validating
(`warehouses.mock.ts:161-186`).

**3.5 Payment quirk (a) — cross-field rule, always on, both modes.** Not a factory: a single
refined schema with the explicit annotation trap 3 requires.

```ts
export const paymentUpsertBaseSchema = paymentSchema.extend({ confirmed: z.boolean().optional() })
export type PaymentUpsert = z.infer<typeof paymentUpsertBaseSchema>

/** `processedAt` is required whenever the payment is confirmed (quirk a). */
export const paymentUpsertSchema: z.ZodType<PaymentUpsert, PaymentUpsert> =
  paymentUpsertBaseSchema.refine((values) => values.confirmed !== true || values.processedAt !== undefined, {
    path: ['processedAt'],
    message: 'Processed at is required when the payment is confirmed',
  })
```

The message renders through the existing per-field `<p role="alert">` under `processedAt` —
a field error, never a toast. `processedAt` is optional-nullable, so the form registers it
with the established `setValueAs` empty-string → `undefined` mapping
(`review-form.tsx:157-160`). Server side, `validateUpsert` gains the same check
(`processedAt is required when confirmed`) and it must also fire on `PATCH` after merging, so
flipping `confirmed` alone on a payment with no `processedAt` returns 400.

**3.6 Payment method `Select` inside RHF.** `Controller` wraps a shadcn `Select` — the same
`Controller` shape the tree uses for `Switch`, with `value={field.value}` /
`onValueChange={field.onChange}`. `<Label htmlFor="method">Method</Label>` +
`<SelectTrigger id="method" aria-invalid={errors.method !== undefined}>` so the trigger is
reachable as `getByRole('combobox', { name: 'Method' })`;
`<SelectValue placeholder="Select a method…" />`; items `card`/`transfer`/`cash` labelled
**Card**/**Transfer**/**Cash**. Domain: `z.enum(['card', 'transfer', 'cash'], 'Method is required')`.
If Radix `Select` misbehaves under jsdom (it did not in batch 2), the only sanctioned
fallback is a native `<select>` — never a hand-rolled listbox.

**3.7 Payment quirk (c) — `?method` filter.** Route search
`method: z.enum(['all', 'card', 'transfer', 'cash']).default('all').catch('all')`;
`PaymentListParams extends ListParams { method?: PaymentMethodFilter }`; forwarded with
`toQueryString(params, { method: params.method && params.method !== 'all' ? params.method : undefined })`
so `all` never reaches the URL; the mock parses it and falls back to `'all'` on an unknown
value, filtering **after** `q`. Control: shadcn `Select`, trigger `aria-label="Method filter"`,
size `sm`, items All/Card/Transfer/Cash — a direct copy of `coupons-page.tsx:109-123`.

**3.8 `q` coverage and sort order per domain** (nested fields stay out of `q`, per
`plans/batch-2.md` §3.7 and the header comment in `warehouses.mock.ts:14-20`):

- vehicles → `plate`, `brand`, `model`; sorted by `plate` `localeCompare`.
- invoices → `String(invoiceNumber)`, `String(supplierId)`; **`billing.*` excluded**; sorted
  by `invoiceNumber` ascending.
- payments → `String(paymentId)`, `method`; sorted by `paymentId` ascending.

**3.9 Pinned fixture contract** (tests reference these, so they are contract; remaining rows
are the mechanic's choice — 24 rows each, all keys unique, all dates literal `YYYY-MM-DD`
strings since nothing in this batch is clock-relative):

| Domain | Pinned |
|---|---|
| vehicles | sorted by `plate`, page 1 = the 10 alphabetically first. `AA-100-XX` → Toyota / Corolla / 2019 / `electric: false` (first row). `AB-220-EV` → Tesla / Model 3 / 2022 / `electric: true`, also on page 1. Exactly **one** row with brand `Peugeot` (so `q=peugeot` → 1) and it is **not** on page 1. At least 8 rows `electric: true`. |
| invoices | `invoiceNumber` 1001…1024 → page 1 = 1001…1010. `1001` → `supplierId: 1`, `total: 1250.5` (renders `$1,250.50`), `issuedAt: '2024-03-14'`, `paid: false`, `billing: { street: '12 Harbour Road', city: 'Oslo', zipCode: '0150' }`. `1002` → `paid: true`. **Every `supplierId` must exist in `SUPPLIERS_FIXTURE` (1…24).** |
| payments | `paymentId` 5001…5024 → page 1 = 5001…5010. Exactly **8 `card`, 8 `transfer`, 8 `cash`** (so `?method=card` → 8). `5001` → `amount: 99.99` (renders `$99.99`), `method: 'card'`, `confirmed: true`, `processedAt: '2024-02-01'`. `5002` → `method: 'transfer'`, `confirmed: false`, **no** `processedAt`. |

**3.10 List columns.**

- Vehicles: Plate (link to detail) · Brand · Model · Year · Electric (badge) · actions
- Invoices: Invoice (link, `#1001`) · Supplier (`supplierId`) · Total (`$1,250.50`) ·
  Issued (`YYYY-MM-DD`) · Paid (**inline `Switch`**) · actions
- Payments: Payment (link, `#5001`) · Amount (`$99.99`) · Method (Card/Transfer/Cash, the
  label never the raw value) · Processed (`YYYY-MM-DD`, `—` when absent) · Confirmed (badge) ·
  actions

**3.11 Detail pages** mirror `review-detail-page.tsx` (`Card` + `dl`). Invoice's `billing`
renders as its own labelled group (Street/City/Zip code) below the flat fields; `total` and
`amount` go through `formatUsd`; Payment's `method` shows the label; absent optional dates
render `—`.

**3.12 Sidebar / overview icons**: Vehicles `Car`, Invoices `FileText`, Payments `CreditCard`
(lucide-react). If a name is missing from the installed version, fall back to `Truck`… no —
`Truck` is taken by Suppliers; fall back to `Bus` / `Receipt` / `Wallet` respectively.

**3.13** `PAGE_SIZE = 10`, 24 fixture rows → "Page 1 of 3" for all three modules. Create
navigates to the list; edit navigates to the entity's detail page (the tree's existing
behaviour).

---

## 4. Delegation plan

Every unit edits the same five shared files (`mocks/core/types.ts`, `mocks/handlers.ts`,
`mocks/setup-test-mocking.ts`, `src/app/shell/app-sidebar.tsx`, `src/routes/index.tsx`) and
self-verifies with whole-project gates, so the mechanic delegations are **serialised**, each
a blocking foreground call:

| Wave | Unit | Agent | Depends on |
|---|---|---|---|
| 0 | `src/shared/lib/currency.ts` (`formatUsd`) | orchestrator | — |
| 1 | **Vehicle** module: full drill + wiring + tests + e2e | `mechanic` | — |
| 2 | **Invoice** module: full drill + quirks a/b/c + tests + e2e | `mechanic` | waves 0, 1 |
| 3 | **Payment** module: full drill + quirks a/b/c + tests + e2e | `mechanic` | wave 2 |

Each delegation prompt carries: the exact file list, the reference file to mirror per file,
the entity's spec lines from `entities-benchmark.txt`, the §3 decisions that apply, and the
tests it must include. Each mechanic runs `pnpm typecheck`, `pnpm lint` and `pnpm test:run`
itself (typecheck **before** tests — routes are generated) and does **not** run
`pnpm test:e2e`: a single dev server owns port 3010 and the orchestrator owns that gate. The
orchestrator reviews every delivery against §1–§3 before the next wave starts.

---

## 5. Verification plan

Per module, before it counts as delivered:

1. **Mock-infra spec** (`mocks/domains/<plural>.mock.spec.ts`): default page size 10 + total
   24; page 3 holds the remaining 4; `q` filters across exactly the documented fields (§3.8);
   `GET` 200/404; `POST` 201 + boolean default; 400 on invalid; 409 on the duplicate unique
   key; `PATCH` partial merge; `DELETE` 204 then 404; state reseeds between tests.
   - Vehicle: `POST` without `electric` → `electric: false`; `year: 1949` → 400.
   - Invoice: `supplierId` of a non-existent supplier → 400 on both `POST` and `PATCH`;
     nested validation (missing `billing.zipCode` → 400); `PATCH { paid: true }` merges
     without touching `billing`; a `PATCH` carrying `billing` replaces it wholesale;
     `total: 0` → 400.
   - Payment: `?method=card` → 8, `?method=transfer` → 8, unknown value → 24; `?method`
     combines with `q`; `POST` with `confirmed: true` and no `processedAt` → 400;
     `PATCH { confirmed: true }` on 5002 (no `processedAt`) → 400; same PATCH with a
     `processedAt` → 200; `amount: -1` → 400.
2. **Section tests** (`src/features/<plural>/presentation/*.test.tsx`): list renders page 1
   from the API, search filters, Next → "Page 2 of 3", row-menu delete with confirmation
   removes the row; form shows validation errors on empty submit without navigating, creates
   and returns to the list, surfaces the server conflict on a duplicate key.
   - Vehicle: `year: 1949` → "Year must be 1950 or later"; a created vehicle defaults to the
     non-electric badge.
   - Invoice (a) picking a supplier through the combobox (open, type, choose an option) fills
     the trigger with `name (id)` and creates; free-typing an unknown numeric id surfaces
     `No supplier with ID “9999”` **under the field**, does not navigate and fires **no
     toast**. (b) toggling the Paid switch on a row updates the row **and preserves the URL**:
     do it from page 2 (or with an active `q`) and assert
     `router.state.location.search` is unchanged and the page still reads "Page 2 of 3";
     with `server.use(...)` forcing the PATCH to fail, assert the error toast appears and the
     switch returns to its previous state. (c) row and detail render `$1,250.50`.
   - Payment (a) `confirmed` on with an empty `processedAt` → "Processed at is required when
     the payment is confirmed" under `processedAt`, no navigation, no toast; filling the date
     then submits successfully; leaving `confirmed` off with an empty `processedAt` creates
     fine. (b) row and detail render `$99.99`. (c) choosing `Transfer` in the Method filter
     puts `method: 'transfer'` in `router.state.location.search` and narrows the list to 8;
     back to `All` restores 24. Method column shows `Card`, never `card`.
3. **E2E** (`e2e/<plural>.spec.ts`, mirroring `e2e/warehouses.spec.ts`): list + pagination,
   search, create, detail + edit, delete with confirmation, duplicate-key server error, each
   entity's quirks, and an axe scan of the list and `/new` pages asserting zero
   serious/critical violations. Invoice's e2e fills `getByLabel('City', { exact: true })`
   (trap 1) and asserts the inline switch toggle shows its toast and the new state.
4. **Gates** — the orchestrator runs, in the foreground, until all four are green:
   `pnpm typecheck && pnpm lint && pnpm test:run && pnpm test:e2e`.
   Expected final counts: 10 mock specs, 18 section-test files, 10 e2e specs.

---

## 6. Execution record

Waves ran in the planned order: 0 (orchestrator: `src/shared/lib/currency.ts`) → 1 (Vehicle,
`mechanic`) → 2 (Invoice, `mechanic`) → 3 (Payment, `mechanic`). Each delivery was reviewed
against §1–§3 before the next wave started; no plan deviations were needed and no mechanic
made a design call of its own.

Resolutions the mechanics reported, all consistent with §3:

- **The relation adaptation held.** Keeping `RelationCombobox` string-valued and converting at
  the `Controller` boundary (§3.2) needed no change to the shared component, and the combobox
  drove cleanly under jsdom on the first attempt — `Command`'s `label` prop already names the
  search input, so `getByPlaceholderText('Search suppliers…')` + `getByRole('option', …)`
  resolve exactly as in the Review reference.
- **The inline Paid switch needed no optimistic machinery.** `useSetInvoicePaid` +
  `invalidateQueries(invoiceKeys.all)` preserves page/search because both live in the URL;
  the section test proves it from `/invoices?page=2`, and a forced 500 (via `server.use`)
  proves the error toast and the switch snapping back.
- **Payment's cross-field refine** took the `z.ZodType<PaymentUpsert, PaymentUpsert>`
  annotation from trap 3 and typechecked immediately. Server-side the rule is enforced against
  the **merged** object in `PATCH`, so flipping `confirmed: true` on 5002 (no `processedAt`)
  returns 400 — the shape Shipment repeats in batch 4.
- **First RHF-bound `Select`** worked under jsdom without a fallback, so §3.6's native-`<select>`
  escape hatch was never used. The idiom is now available to Ticket's `priority` (batch 4).
- **Optional-date label**: `Processed at (optional)` renders the hint in a `<span>` inside the
  `<Label>`, so the accessible name includes it — tests query it with `{ exact: false }`,
  matching Book's `Published` label (`book-form.test.tsx:27`).
- Invoice fixture row 1003 uses `supplierId: 13` on purpose so `q=13` proves `q` matches both
  `invoiceNumber` and `supplierId`.

**Orchestrator fixes after reviewing the deliveries:**

1. `invoice-form.test.tsx` — the "no toast" assertion was written as `queryByText(/created/)`
   with a comment declaring the test order load-bearing. Replaced with two assertions keyed to
   this case's own invoice number (`Invoice #2002 created`, `supplierId 9999 does not exist`),
   which hold regardless of execution order; the ordering comment is gone.
2. `payment-form.tsx` — the e2e run logged React's "Select is changing from uncontrolled to
   controlled" warning: on create, `field.value` starts `undefined`. Fixed with
   `value={field.value ?? ''}` (Radix shows the placeholder for `''` exactly as for
   `undefined`), so the control is controlled from first render. Re-verified: the warning no
   longer appears in the Playwright log.

**Final gate run (orchestrator, foreground)** — all four green:

| Gate | Result |
|---|---|
| `pnpm typecheck` | pass |
| `pnpm lint` | pass (oxlint, no findings) |
| `pnpm test:run` | 30 files / 244 tests passed |
| `pnpm test:e2e` | 80 tests passed (vehicles 9, invoices 9, payments 10 added to batch 2's 53) |

Delivered: 10 mock specs, 18 section-test files, 10 e2e specs — Batch 3 is done.
Shapes established here for later batches: the USD formatter (`src/shared/lib/currency.ts`,
no further spec'd consumer), the numeric-relation adaptation at the combobox boundary, the
row-level PATCH-and-invalidate action (Ticket's Close/Reopen and Subscription's Renew reuse
the plumbing through a row *menu* rather than a switch), the field-to-field `.refine()`
(Shipment's `shippedAt`-when-`delivered` is a structural repeat), the RHF-bound `Select`
(Ticket's `priority`), and the second embedded object (Shipment's `destination`).
