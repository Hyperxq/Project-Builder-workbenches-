# Batch 4 — Shipment [T2], Ticket [T2], Event [T3]

Orchestrator plan per `HARNESS.md`. Authority on architecture/patterns is `AGENTS.md`;
design language is `DESIGN.md`. Reference module: **Author** (`src/features/authors/**`).
Closest precedents for this batch: **Payment** (batch 3 — cross-field `.refine()`, RHF-bound
`Select`, enum URL filter), **Warehouse**/**Invoice** (batch 2/3 — embedded object),
**Invoice** (batch 3 — row-level PATCH-and-invalidate), **Coupon** (batch 2 — `?status`
filter, clock-relative fixtures via `isoDateOffset`).

Baseline confirmed green before any change (orchestrator, foreground):
`pnpm typecheck` · `pnpm lint` · `pnpm test:run` (30 files / 244 tests).

`plan-directives/` does not exist — no external directives to incorporate.

---

## 1. Modules

### 1.1 Shipment — Tier T2

Fields (`entities-benchmark.txt:134-148`): `trackingCode: string, required, unique` ·
`weight: number, required, > 0` · `shippedAt: date, optional*` ·
`delivered: boolean, required, default false` ·
`destination: embedded, required { street, city, country — all string, required }`.
Quirks: (a) `shippedAt` REQUIRED when `delivered = true` (field error on `shippedAt`),
(b) BULK ACTION — row checkboxes, a "Mark delivered" bar at ≥1 selected, one PATCH per
selected shipment, one toast reporting "N shipments updated".

| File | Mirrors |
|---|---|
| `mocks/core/types.ts` (+5 keys `LIST_SHIPMENTS`…`DELETE_SHIPMENT`) | append after `'DELETE_PAYMENT'` (`:64`) |
| `mocks/fixtures/shipments.fixture.ts` (24 rows) | `payments.fixture.ts` |
| `mocks/domains/shipments.mock.ts` (+ `resetShipments`) | `payments.mock.ts` (cross-field rule) + `warehouses.mock.ts` (embedded) |
| `mocks/domains/shipments.mock.spec.ts` | `payments.mock.spec.ts` |
| `mocks/handlers.ts` (`:10` import area, `:44` spread) · `mocks/setup-test-mocking.ts` (`:9`, `:53`) | existing |
| `src/features/shipments/domain/shipment.ts` | `domain/payment.ts` + `domain/warehouse.ts` |
| `src/features/shipments/infrastructure/shipments.api.ts` | `infrastructure/payments.api.ts` (no extra filter — plain `ListParams`) |
| `src/features/shipments/application/use-shipments.ts` | `use-payments.ts` + `useSetInvoicePaid` (`use-invoices.ts:65-72`) for the new bulk hook |
| `src/features/shipments/presentation/shipments-page.tsx` | `invoices-page.tsx` (row mutation) |
| `…/shipment-form.tsx` | `payment-form.tsx` (refine) + `warehouse-form.tsx` (`FieldSet`) |
| `…/shipment-create-page.tsx` · `…-edit-page.tsx` · `…-detail-page.tsx` | Payment equivalents |
| `…/delivered-badge.tsx` | `confirmed-badge.tsx` |
| `…/shipments-page.test.tsx` · `…/shipment-form.test.tsx` | Payment equivalents |
| `src/routes/shipments/{index,new}.tsx`, `src/routes/shipments/$trackingCode/{index,edit}.tsx` | `src/routes/vehicles/**` (string param — **no `Number(...)` cast**) |
| `src/app/shell/app-sidebar.tsx` (one NAV line) · `src/routes/index.tsx` (one card) | existing |
| `e2e/shipments.spec.ts` | `e2e/payments.spec.ts` |

### 1.2 Ticket — Tier T2

Fields (`entities-benchmark.txt:162-174`): `ticketNumber: number, required, unique` ·
`subject: string, required` · `priority: enum(1=Low | 2=Medium | 3=High), required` ·
`openedAt: date, required` · `open: boolean, required, default true`.
Quirks: (a) priority as a colored badge, High in the destructive tone, LABEL never the raw
number, (b) DATE RANGE filter `?from=YYYY-MM-DD&to=…` over `openedAt` with two date inputs
in the toolbar, (c) row-menu "Close"/"Reopen" toggling `open` (PATCH + toast).

Same file list with `tickets`/`ticket`, key param `$ticketNumber` (numeric — the route
component casts with `Number(...)` exactly like `src/routes/payments/$paymentId/index.tsx:10`),
**plus** `src/features/tickets/presentation/priority-badge.tsx` and
`…/open-badge.tsx`. No new shared file.

### 1.3 Event — Tier T3

Fields (`entities-benchmark.txt:176-189`): `slug: string, required, unique` ·
`title: string, required` · `startsAt: date, required` · `seats: number, required, min 0` ·
`published: boolean, required, default false`.
HEAVY — publish workflow: (a) forms never expose `published`; state changes only through
explicit Publish/Unpublish actions on the detail page, (b) publishing is rejected with
**422** when `startsAt` is in the past OR `seats === 0`, and the UI shows the reason,
(c) list filter All | Published | Draft (URL-driven) + a per-row status badge.

Same file list with `events`/`event`, key param `$slug` (string — no cast), **plus**:

- `mocks/core/errors.ts` gains `unprocessable()` (422) — orchestrator-owned, §3.0
- `src/features/events/presentation/event-status-badge.tsx` (Published/Draft)
- `src/features/events/presentation/event-detail-page.test.tsx` — a **third** section-test
  file for this feature, because the publish workflow lives on the detail page

---

## 2. Pattern inventory (scout report, incorporated)

The `scout` sub-agent ran read-only over `AGENTS.md`, `DESIGN.md`, `entities-benchmark.txt`,
all three prior plans, every feature module, every mock domain, `src/shared/**`,
`src/components/ui/**`, `src/routes/**`, `src/app/shell/**`, `src/test/**`, `e2e/**` and the
configs. Its findings, with the evidence it cited:

### Shipment — base CRUD, the embedded object and the cross-field rule all EXIST; the bulk action is NEW

- **String unique key** (`trackingCode`): 6th occurrence — Book `isbn`
  (`src/features/books/domain/book.ts:14`), Category/Coupon/Warehouse `code`, Vehicle `plate`.
  Route param stays a string, **no `Number(...)` cast** in the route component.
- **`weight > 0`**: exact mirror of Payment `amount` (`payment.ts:24`) / Invoice `total`
  (`invoice.ts:29`) — `.positive()`, deliberately **not** `.int()`.
- **Boolean defaulting FALSE** (`delivered`): 3rd occurrence after Review `verified` and
  Payment `confirmed` (`payment.ts:33`, `payment-form.tsx:55`, `payments.mock.ts:155`).
- **EMBEDDED object**: 3rd occurrence. Warehouse `location` established the idiom
  (`warehouse.ts:19-30`, `warehouse-form.tsx:92-152`, `warehouses.mock.ts:77-96,161-186`);
  Invoice `billing` (`invoice.ts:18-22`) is three plain required strings — `destination` is
  the same shape with `zipCode` → `country`. Verbatim mirror, zero new design surface.
- **Cross-field rule (quirk a)**: structurally identical to Payment's
  `processedAt`-when-`confirmed`. Domain template `payment.ts:43-50`; mock template
  `payments.mock.ts:94-100` (`validateConfirmedRule`) plus the re-check against the **merged**
  object on `PATCH` (`payments.mock.ts:172-175`). `plans/batch-3.md:164` predicted this
  exact repeat. Only the field names change.
- **BULK ACTION (quirk b) is NEW on four axes**, and none of them exist anywhere in the tree:
  1. `src/components/ui/checkbox.tsx` exists as a generated shadcn primitive but
     `grep -rn "Checkbox" src --include='*.tsx' | grep -v components/ui` → **0 hits**. No
     feature has ever imported it.
  2. Multi-row selection state: no precedent. The only list-local state today is
     `deleteTarget` (a single nullable entity, e.g. `invoices-page.tsx:47`).
  3. A conditional toolbar: every existing toolbar (`coupons-page.tsx:88-124`,
     `payments-page.tsx:89-126`, `reviews-page.tsx:103-112`) is static.
  4. Fan-out mutation → **one** aggregate toast: every toast in the tree wraps exactly one
     mutation (`invoices-page.tsx:68-71`). A `Promise.allSettled` fan-out has no precedent.
  Reusable plumbing: the PATCH-and-invalidate mutation shape of `useSetInvoicePaid`
  (`use-invoices.ts:65-72`) and the guarantee it depends on — `page`/`q` live in the URL via
  `validateSearch` + `getRouteApi`, never in the query cache, so invalidating the list key
  refetches under the same params.
  **Repeats in the remaining schedule (Batch 5): 0.** Neither Subscription nor Employee has a
  bulk shape. Therefore the bulk machinery stays **entity-local** — no shared component.

### Ticket — the badge, the row action and the RHF `Select` EXIST; the numeric enum and the date range are NEW

- **Numeric unique key** (`ticketNumber`) = `authorId`/`reviewId`/`invoiceNumber`/`paymentId`.
  **`open` defaults TRUE** — that is Author's `active` idiom (`?? true`), *not* the
  false-defaulting idiom Shipment uses; the two modules in this batch differ here and the
  mechanics must not cross-copy.
- **Entity-local badge component**: 7 precedents, all
  `<Badge variant="outline" className="gap-1.5 text-xs font-normal">` + a
  `size-1.5 rounded-full` dot (`confirmed-badge.tsx:6-9`, `coupon-status-badge.tsx:12-18`).
  `badge.tsx:15-16` **does** define a `destructive` variant but
  `grep -rn 'Badge variant=' src/features` → 7 hits, all `outline`: Ticket's High badge is
  the first consumer of `variant="destructive"`.
- **Numeric-valued enum in Zod**: `grep -rn 'z.enum(\[1' src/features/*/domain` → 0 hits.
  Payment's `method` is string-valued (`payment.ts:25`). NEW. The label-lookup table
  `PAYMENT_METHOD_LABELS` (`payment.ts:55-59`, "raw enum values never reach the UI") is the
  idiom to copy.
- **RHF-bound `Select`** EXISTS since batch 3 (`payment-form.tsx:92-121`), proven under jsdom
  (`plans/batch-3.md:467-468`). The **numeric** value is the new twist: Radix `Select` is
  string-valued, so the `Controller` must adapt at the edge — the same edge-adaptation
  `plans/batch-3.md` §3.2 used for Invoice's numeric `supplierId` through the string-only
  `RelationCombobox`.
- **URL filters** are all single-valued enums today: Review `?verified`
  (`src/routes/reviews/index.tsx`), Coupon `?status` (`src/routes/coupons/index.tsx:15`),
  Payment `?method` (`src/routes/payments/index.tsx:15`). A **two-parameter free-string date
  range is NEW** — `plans/batch-2.md:139` already warned it "must not be conflated" with the
  enum filter. `toQueryString`'s `extra` (`pagination.ts:23-36`) is a generic
  `Record<string, string | undefined>` that skips `undefined`/`''`, so it already carries two
  keys with **no change to the shared file**. Mock-side, `parsePage` returning an extra field
  with a fallback (`payments.mock.ts:56-71`) is the template; the two-sided
  `YYYY-MM-DD` string comparison is new logic but rests on the locked idiom that
  lexicographic order equals chronological order for that format (`dates.ts:1-12`).
- **Row-menu mutation (quirk c)**: every one of the 10 existing list pages has exactly two
  `DropdownMenuItem`s — `Edit` (a `Link`, `asChild`) and `Delete` (destructive `onSelect`),
  e.g. `invoices-page.tsx:198-211`. A **third, mutating** item is new UI surface, but the
  mechanism is `useSetInvoicePaid`'s PATCH-and-invalidate + toast pair verbatim
  (`use-invoices.ts:65-72`, `invoices-page.tsx:64-73`), just triggered from `onSelect`
  instead of `onCheckedChange`. `plans/batch-3.md:499-500` predicted exactly this.
  **Repeats in Batch 5: 1** — Subscription's "Renew" is the same shape (increment instead of
  toggle), so the mechanic must keep the hook shape clean and copyable.

### Event — the list filter EXISTS; the publish workflow is NEW end to end

- **`?status` filter (heavy c)**: 3rd occurrence of the locked three-point idiom (route
  `validateSearch` enum with `.default().catch()` → `EventListParams extends ListParams` +
  `toQueryString(params, {status})` → mock parse + filter **after** `q` → toolbar `Select`
  with an `aria-label`). Coupon is the template (`src/routes/coupons/index.tsx:15`,
  `coupons.api.ts`, `coupons-page.tsx:109-123`). Simpler than Coupon's, because the status is
  the raw `published` boolean rather than a date-derived value.
- **Excluding a stored field from the upsert schema is NEW**:
  every existing `*UpsertSchema` either `.extend()`s the entity schema to make the boolean
  optional (`payment.ts:33`) or aliases it (`warehouse.ts:44`). No upsert schema has ever
  **removed** a field. Event's is the first `.omit({ published: true })`.
- **Detail-page action buttons are NEW**: every `*-detail-page.tsx` header holds exactly
  `Edit` (Link) and `Delete` (AlertDialog-confirmed), e.g. `payment-detail-page.tsx:63-74`.
  Reusable: the mutate-then-toast mechanics of the Delete button; new: a state-toggling pair
  of workflow buttons.
- **422 does not exist**: `mocks/core/errors.ts:11-25` defines exactly `notFound` (404),
  `badRequest` (400), `conflict` (409), `serverError` (500); `grep -rn "422" mocks src` → 0
  hits. A helper must be added.
- **No mock domain has a 6th route**: all 10 domains expose exactly the 5 CRUD handlers, and
  `MockRouteKey` (`mocks/core/types.ts:14-64`) contains only `LIST_/GET_/CREATE_/UPDATE_/DELETE_`
  keys. `AGENTS.md:71` states the five-route contract. Publishing therefore either reuses
  `PATCH` or breaks the contract — an orchestrator decision (§3.6).
- **Non-409 server errors** surface today only through the form-level `serverError` prop
  (`payment-create-page.tsx:28` → `payment-form.tsx:156-160`). A detail-page action has no
  such slot; the nearest neighbour is `toast.error(error.message)` on a failed delete
  (`payment-detail-page.tsx:35`). `ApiError` (`client.ts:3-17`) already carries `.status` and
  derives `.message` from the body's `error` key, so a 422 flows through unchanged.
- **Clock-relative fixtures**: `src/shared/lib/dates.ts:14-30` exports `todayIso()` and
  `isoDateOffset(days)` (both UTC, usable from app, mocks and tests);
  `mocks/fixtures/coupons.fixture.ts:21-51` is the template for a fixture whose rows must keep
  meaning "past"/"future" as the calendar advances. Event's `startsAt` is the second consumer.
  Note the difference from Coupon: Coupon's future-date rule is a **create-time** schema
  refine; Event's is a **publish-time server guard** over already-stored data — `startsAt` is
  freely settable to a past date on create/edit.
- **Repeats in Batch 5: 0.** The whole publish workflow is a one-off.

### Mechanical facts (from scout; binding for all delegations)

- `mocks/core/types.ts:14-64` — `MockRouteKey`, last entry `'DELETE_PAYMENT'`; append 5 keys
  per entity after it.
- `mocks/handlers.ts:5-14` imports (alphabetical) · `:34-45` returned array
  (last `...paymentHandlers(config, base),` at `:44`).
- `mocks/setup-test-mocking.ts:4-13` imports (alphabetical) · `:42-54` `afterEach`
  (last `resetPayments()` at `:53`).
- `src/app/shell/app-sidebar.tsx:2-14` icon imports · `:25-37` `NAV`
  (last `{ to: '/payments', label: 'Payments', icon: CreditCard }`).
- `src/routes/index.tsx:2-14` icon imports · `:32-199` card grid (last card Payments,
  `:182-198`).
- Icons already taken: `LayoutDashboard`, `Users`, `BookOpen`, `Tags`, `Star`, `Truck`,
  `BadgePercent`, `Warehouse`, `Car`, `FileText`, `CreditCard`.
- `PAGE_SIZE = 10` per list page; **24 fixture rows** per domain → "Page 1 of 3".
- `src/routeTree.gen.ts` is generated by the `tanstackRouter` vite plugin and imported by
  `src/test/render-app.tsx` — **run `pnpm typecheck` before `pnpm test:run` whenever routes
  change**.
- `renderApp(path)` returns `{ ...result, router }`; section tests assert on
  `router.state.location.{pathname,search}`.
- `server` from `mocks/setup-test-mocking.ts` may be imported by a section test to override a
  single handler with `server.use(...)`; `afterEach` resets overrides and reseeds state.
- `.oxlintrc.json` disables `react/only-export-components` only for `src/routes/**` and
  `src/components/ui/**` — one component per file everywhere else.
- Cross-feature import rule (batch 1, still binding): a feature may import another feature's
  `domain`/`infrastructure`/`application`, **never** its `presentation`.
- No `--warning` colour token exists (`src/index.css:42-44,66-68` define only `destructive`,
  `success` beyond the base palette) — §3.4 picks tones from what exists.

### Traps carried forward (binding)

1. **Playwright/Testing-Library label matching is substring-based** — Shipment's
   `destination.city` must be queried as `getByLabel('City', { exact: true })`, exactly as
   Warehouse and Invoice do (`e2e/warehouses.spec.ts:39-41`, `invoice-form.test.tsx:39`).
2. **List sort order vs the page-1 window** — tests may only target fixture rows inside the
   first 10 sorted rows, or must page/search first. Pinned windows are fixed in §3.10.
3. **`zodResolver` cannot infer a refined schema's type** — Shipment's refined upsert schema
   needs the explicit `z.ZodType<ShipmentUpsert, ShipmentUpsert>` annotation (`payment.ts:43`).
4. **Radix `Select` starts uncontrolled on `undefined`** — bind `value={field.value ?? ''}`
   (`payment-form.tsx:98-102`); for Ticket the value is numeric, so §3.4's conversion applies.
5. **Serialised delegation**: every module edits the same five shared files, so mechanic waves
   run one at a time, each a blocking foreground call.
6. **Optional-date label**: `Shipped at (optional)` renders the hint in a `<span>` inside the
   `<Label>` (`payment-form.tsx:124-126`), so tests query it with `{ exact: false }`.

---

## 3. Orchestrator design decisions (mechanics implement, never decide)

**3.0 `unprocessable()` in `mocks/core/errors.ts` (orchestrator-owned, wave 0).** One more
one-call helper beside the existing four, same shape:

```ts
/** 422 — the request was well-formed but a workflow rule rejects it (Event's publish guard). */
export function unprocessable(message = 'Unprocessable') {
  return HttpResponse.json({ error: message }, { status: 422 })
}
```

Rationale: `badRequest` already means "the payload is malformed"; the publish guard rejects a
*valid* payload for a workflow reason, and the spec names 422 explicitly. `ApiError` carries
`.status` and derives `.message` from the body's `error` key, so nothing else changes.

**3.1 Shipment quirk (a) — cross-field rule, always on, both modes.** A single refined schema
with the explicit annotation trap 3 requires, mirroring `payment.ts:43-50`:

```ts
export const shipmentUpsertBaseSchema = shipmentSchema.extend({ delivered: z.boolean().optional() })
export type ShipmentUpsert = z.infer<typeof shipmentUpsertBaseSchema>

/** `shippedAt` is required whenever the shipment is delivered (quirk a). */
export const shipmentUpsertSchema: z.ZodType<ShipmentUpsert, ShipmentUpsert> =
  shipmentUpsertBaseSchema.refine(
    (values) => values.delivered !== true || values.shippedAt !== undefined,
    { path: ['shippedAt'], message: 'Shipped at is required when the shipment is delivered' },
  )
```

The message renders through the existing per-field `<p role="alert">` under `shippedAt` — a
field error, never a toast. `shippedAt` registers with the established `setValueAs`
empty-string → `undefined` mapping. Server side, the rule is a separate
`validateDeliveredRule` (not folded into `validateUpsert`) so `PATCH` can check it against the
**merged** object: flipping `delivered: true` alone on a shipment with no `shippedAt` returns
400. This is `payments.mock.ts:94-100,172-175` with renamed fields.

**3.2 Shipment quirk (b) — bulk action: entity-local, `Promise.allSettled`, exactly one toast.**
Batch 5 has no bulk repeat, so nothing is generalised into `src/shared/`. The application layer
gains one hook beside the standard five:

```ts
export interface BulkDeliveredResult {
  updated: number
  /** Tracking codes whose PATCH was rejected (e.g. quirk (a): no `shippedAt`). */
  failed: string[]
}

export function useMarkShipmentsDelivered() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (trackingCodes: string[]): Promise<BulkDeliveredResult> => {
      const results = await Promise.allSettled(
        trackingCodes.map((code) => shipmentsApi.update(code, { delivered: true })),
      )
      const failed = trackingCodes.filter((_, index) => results[index].status === 'rejected')
      return { updated: trackingCodes.length - failed.length, failed }
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: shipmentKeys.all }),
  })
}
```

- **`allSettled`, not `all`** — quirks (a) and (b) genuinely interact: a selected shipment with
  no `shippedAt` is rejected by the server rule. The bulk action does **not** paper over that by
  inventing a date; it reports the partial outcome. This is a deliberate decision, and it is
  tested.
- **The PATCH body is `{ delivered: true }` only.** Never send a synthesised `shippedAt`.
- **Exactly one toast**, chosen by outcome (the spec's "one toast" requirement):
  - all succeeded → `toast.success('3 shipments updated')` (singular: `'1 shipment updated'`)
  - none succeeded → `toast.error('Could not update 2 shipments')` (singular: `'… 1 shipment'`)
  - mixed → `toast.error('2 of 3 shipments updated')`
- **Selection state**: `useState<Set<string>>` of tracking codes in `shipments-page.tsx`.
  The bar acts on `selectedOnPage = data.items.filter((s) => selected.has(s.trackingCode))`, so
  a stale selection from another page can never be mutated invisibly and no `useEffect` is
  needed. After the mutation settles, `setSelected(new Set(result.failed))` — successes clear,
  failures stay selected for a retry.
- **Markup**: a leading `<TableHead className="w-8">` holding a header `Checkbox` with
  `aria-label="Select all shipments on this page"` and
  `checked={allOnPageSelected ? true : someOnPageSelected ? 'indeterminate' : false}`; each row
  gets a leading `<TableCell>` with a `Checkbox` labelled
  `Select shipment ${trackingCode}` (never inside the row's `Link`). The bar renders **only**
  when `selectedOnPage.length >= 1`, between the toolbar and the table, as
  `<div role="region" aria-label="Bulk actions" className="mb-4 flex items-center gap-3 rounded-lg border bg-card px-4 py-2">`
  containing `<span className="text-sm">{n} selected</span>`, a
  `<Button size="sm">Mark delivered</Button>` (disabled while the mutation is pending) and a
  `<Button size="sm" variant="ghost">Clear</Button>`.

**3.3 Shipment embedded `destination` follows Warehouse/Invoice verbatim.** `FieldSet` +
`<FieldLegend variant="label">Destination</FieldLegend>` wrapping three
`<div className="space-y-2">` groups; `register('destination.street' | '.city' | '.country')`;
errors read `errors.destination?.city`; ids `destination.street` / `destination.city` /
`destination.country` with labels **Street**, **City**, **Country**. Mock side: one 400 message
per nested field (`destination.city is required`, …) and a `PATCH` carrying `destination`
**replaces the whole nested object** before re-validating (`warehouses.mock.ts:161-186`).
Nested fields stay out of `q` (the documented decision at `warehouses.mock.ts:14-20`), so
Shipment's `q` searches `trackingCode` only.

**3.4 Ticket quirk (a) — numeric enum, label table, badge tones.** Domain:

```ts
priority: z.literal([1, 2, 3], 'Priority is required'),   // verified against zod 4.4.3
export type TicketPriority = Ticket['priority']
/** Single source of truth for how each priority renders — raw numbers never reach the UI. */
export const TICKET_PRIORITY_LABELS: Record<TicketPriority, string> = { 1: 'Low', 2: 'Medium', 3: 'High' }
/** Ordered for the form Select and the badge; avoids `Object.entries`' string-key widening. */
export const TICKET_PRIORITIES: TicketPriority[] = [1, 2, 3]
```

`priority-badge.tsx` renders the LABEL and, per the spec, High in the destructive tone. Since
no `--warning` token exists, the three tones are:

- `3` → `<Badge variant="destructive" className="text-xs font-normal">High</Badge>` (no dot —
  the tone itself carries the meaning; first consumer of the variant)
- `2` → `<Badge variant="outline" className="gap-1.5 text-xs font-normal">` + `bg-primary` dot
- `1` → same outline badge + `bg-muted-foreground` dot

The form's `Select` adapts at the `Controller` boundary, the way `plans/batch-3.md` §3.2 adapted
Invoice's numeric `supplierId`: `value={field.value === undefined ? '' : String(field.value)}`
and `onValueChange={(next) => field.onChange(Number(next))}`, items
`<SelectItem key={p} value={String(p)}>{TICKET_PRIORITY_LABELS[p]}</SelectItem>`.
`<Label htmlFor="priority">Priority</Label>` + `<SelectTrigger id="priority" …>` so it is
reachable as `getByRole('combobox', { name: 'Priority' })`.

**3.5 Ticket quirk (b) — `?from&to` date range.** Route search schema:

```ts
const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/
const ticketsSearchSchema = z.object({
  page: z.number().int().min(1).default(1).catch(1),
  q: z.string().default('').catch(''),
  from: z.string().regex(ISO_DATE).optional().catch(undefined),
  to: z.string().regex(ISO_DATE).optional().catch(undefined),
})
```

so a malformed bound falls out of the URL instead of erroring. `TicketListParams extends
ListParams { from?: string; to?: string }`; forwarded with
`toQueryString(params, { from: params.from, to: params.to })` — `toQueryString` already skips
`undefined`/`''`, so **`src/shared/api/pagination.ts` is not modified**. The mock parses both
with the same regex (invalid → ignored) and filters **after** `q`:
`openedAt >= from` and `openedAt <= to`, inclusive on both ends, as plain string comparisons
(`dates.ts:1-12`). Toolbar: two `Input type="date"` controls beside the search box with
`aria-label="From date"` / `aria-label="To date"`, `value={from ?? ''}`, and
`onChange` → `navigate({ search: { q, page: 1, from: value || undefined, to }, replace: true })`.

**3.6 Ticket quirk (c) — row-menu Close/Reopen.** One extra hook, shaped so Batch 5's
Subscription "Renew" can copy it:

```ts
export function useSetTicketOpen() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ ticketNumber, open }: { ticketNumber: number; open: boolean }) =>
      ticketsApi.update(ticketNumber, { open }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ticketKeys.all }),
  })
}
```

A **third** `DropdownMenuItem` above Delete, labelled `Close` when `ticket.open` and `Reopen`
otherwise, `onSelect` firing the mutation with
`toast.success('Ticket #4001 closed' | 'Ticket #4001 reopened')` and
`toast.error(error.message)`. Invalidation (not optimistic update) is again what preserves
page/search/filter state, since all of it lives in the URL.

**3.7 Event heavy (a)+(b) — publish goes through `PATCH`, guarded server-side, 422.**
The five-route wire contract in `AGENTS.md:71-79` is not broken for one entity: publishing is
`PATCH /events/:slug` with `{ published }` under the existing `UPDATE_EVENT` key. The domain
keeps the boundary honest:

```ts
export const eventSchema = z.object({ slug, title, startsAt, seats, published: z.boolean() })
/** Forms never expose `published` (heavy a) — it is the ONLY upsert schema in the tree that omits a stored field. */
export const eventUpsertSchema = eventSchema.omit({ published: true })
export type EventUpsert = z.infer<typeof eventUpsertSchema>
/** Wire-level PATCH body: an upsert subset, plus the workflow-only `published` flag. */
export type EventPatch = Partial<EventUpsert> & { published?: boolean }
```

`eventsApi.update(slug, payload: Partial<EventUpsert>)` stays the form's path;
`eventsApi.setPublished(slug, published: boolean)` is the workflow's path — both `PATCH`
`/events/:slug`, so the presentation layer never hand-builds the publish payload and
`EventUpsert` never grows `published`. Application hook `useSetEventPublished()` mirrors
`useSetInvoicePaid` and invalidates `eventKeys.all`.

Mock rules:

- `POST` **ignores** any `published` in the body and always stores `false` — creation cannot
  bypass the workflow.
- `PATCH` runs the guard whenever `body.published === true`, **before** merging, in this order:
  1. `startsAt` (merged value) `< todayIso()` → `unprocessable('Cannot publish an event that starts in the past')`
  2. `seats === 0` → `unprocessable('Cannot publish an event with no seats')`
- Unpublishing (`{ published: false }`) is never guarded.

**3.8 Event heavy (a)+(b) — the detail page is the only publish surface, and it shows the
reason inline.** The detail header gains, before Edit/Delete: `Publish` (`Send` icon,
`size="sm"`) when `!event.published`, `Unpublish` (`Undo2`, `variant="outline"`) when it is.
Feedback is **asymmetric on purpose**:

- success → `toast.success('Event "annual-summit" published' | '… unpublished')`
- failure → a persistent inline `<p role="alert" className="mt-3 text-sm text-destructive">`
  under the header, fed straight from the mutation's own error
  (`setPublished.error instanceof ApiError ? setPublished.error.message : undefined`) — **no
  toast**.

Rationale: the spec requires the UI to *show the reason*, and a reason a user must read should
not evaporate on a timer. Using only one surface also keeps the reason a single node in the
DOM, so `getByText(...)` in tests cannot hit an ambiguous match. This mirrors how forms surface
`serverError` (`payment-form.tsx:156-160`), transplanted to a page that has no form.
No `published` control appears in `event-form.tsx` at all.

**3.9 Event heavy (c) — `?status` filter, verbatim Coupon.** Route search
`status: z.enum(['all', 'published', 'draft']).default('all').catch('all')`;
`EventListParams extends ListParams { status?: EventStatusFilter }`; forwarded with
`toQueryString(params, { status: params.status && params.status !== 'all' ? params.status : undefined })`
so `all` never reaches the URL; the mock parses it, falls back to `'all'` on an unknown value
and filters **after** `q`. Toolbar `Select` with `aria-label="Status filter"`, `size="sm"`,
items All/Published/Draft — a direct copy of `coupons-page.tsx:109-123`. Row badge:
`event-status-badge.tsx`, outline + dot (`bg-success` published, `bg-muted-foreground` draft),
label **Published** / **Draft**.

**3.10 `q` coverage and sort order per domain** (nested fields stay out of `q`):

- shipments → `trackingCode` only (`destination.*` excluded); sorted by `trackingCode`
  `localeCompare`.
- tickets → `String(ticketNumber)`, `subject`; sorted by `ticketNumber` ascending.
- events → `slug`, `title`; sorted by `slug` `localeCompare`.

**3.11 Pinned fixture contract** (tests reference these, so they are contract; remaining rows
are the mechanic's choice — 24 rows each, all keys unique):

| Domain | Pinned |
|---|---|
| shipments | `TRK-1001`…`TRK-1024` (fixed width → lexicographic = numeric); page 1 = `TRK-1001`…`TRK-1010`. `TRK-1001` → `weight: 12.5`, `shippedAt: '2024-05-02'`, `delivered: false`, `destination: { street: '14 Dock Street', city: 'Rotterdam', country: 'Netherlands' }`. `TRK-1002` → `delivered: true`, `shippedAt: '2024-04-18'`. `TRK-1003` → **no `shippedAt`**, `delivered: false` (the bulk-failure row). `TRK-1004` → `shippedAt` set, `delivered: false`. Exactly **8 delivered** rows (`TRK-1002/1005/1008/1011/1014/1017/1020/1023`), every one of them with a `shippedAt`. Exactly **3 rows without `shippedAt`** (`TRK-1003/1012/1021`), all `delivered: false`. Dates are literal `YYYY-MM-DD` — nothing here is clock-relative. |
| tickets | `ticketNumber` 4001…4024 → page 1 = 4001…4010. `openedAt` is literal and blocked by eight: 4001-4008 → `2024-01-01`…`2024-01-08`, 4009-4016 → `2024-02-01`…`2024-02-08`, 4017-4024 → `2024-03-01`…`2024-03-08`. So `?from=2024-02-01&to=2024-02-28` → **8**, `?from=2024-01-03&to=2024-01-05` → **3**, `?to=2024-01-08` → **8**, `?from=2024-03-01` → **8**. `priority` cycles 3, 1, 2 from 4001 (→ 4001 High, 4002 Low, 4003 Medium; exactly 8 of each). `4001` → `subject: 'Login fails on Safari'` (the only subject containing "Safari", so `q=safari` → 1), `open: true`. `4002` → `open: false` (Reopen is testable on page 1). Exactly **8 closed** rows (every third from 4002). |
| events | 24 slugs, sorted; page 1 = the 10 alphabetically first. `annual-summit` → `title: 'Annual Summit'`, `startsAt: isoDateOffset(30)`, `seats: 250`, `published: false` (publishes cleanly). `beta-launch` → `startsAt: isoDateOffset(21)`, `seats: 0`, `published: false` (publish → 422 seats). `charity-gala` → `startsAt: isoDateOffset(-20)`, `seats: 120`, `published: false` (publish → 422 past). `design-review` → `startsAt: isoDateOffset(14)`, `seats: 40`, `published: true` (Unpublish + the Published filter). All four are on page 1. Exactly **8 published**, 16 draft. `startsAt` uses `isoDateOffset` throughout (never a literal) so past/future keeps meaning as the calendar advances — the `coupons.fixture.ts:1-20` rule. Only `annual-summit` contains "annual", so `q=annual` → 1. |

**3.12 List columns.**

- Shipments: **checkbox** · Tracking (link to detail) · Weight · Shipped (`YYYY-MM-DD`, `—`
  when absent) · Destination city (`destination.city`) · Delivered (badge) · actions
- Tickets: Ticket (link, `#4001`) · Subject · Priority (badge, label only) · Opened
  (`YYYY-MM-DD`) · Status (Open/Closed badge) · actions
- Events: Slug (link) · Title · Starts (`YYYY-MM-DD`) · Seats · Status (Published/Draft badge)
  · actions

**3.13 Detail pages** mirror `payment-detail-page.tsx` (`Card` + `dl`). Shipment's
`destination` renders as its own labelled group (Street/City/Country) below the flat fields;
absent optional dates render `—`; Ticket shows the priority LABEL and the badge; Event shows
the status badge plus the workflow buttons of §3.8.

**3.14 Sidebar / overview icons** (all verified present in the installed lucide-react 1.31.0):
Shipments `Package`, Tickets `Ticket`, Events `CalendarDays`; the detail-page workflow buttons
use `Send` (Publish) and `Undo2` (Unpublish).

**3.15** `PAGE_SIZE = 10`, 24 fixture rows → "Page 1 of 3" for all three modules. Create
navigates to the list; edit navigates to the entity's detail page (the tree's existing
behaviour). Toast copy follows the tree: `Shipment "TRK-1001" created/updated/deleted`
(string key, quoted, like Coupon) and `Ticket #4001 …` (numeric key, `#`, like Payment);
`Event "annual-summit" …`.

---

## 4. Delegation plan

Every unit edits the same five shared files (`mocks/core/types.ts`, `mocks/handlers.ts`,
`mocks/setup-test-mocking.ts`, `src/app/shell/app-sidebar.tsx`, `src/routes/index.tsx`) and
self-verifies with whole-project gates, so the mechanic delegations are **serialised**, each a
blocking foreground call:

| Wave | Unit | Agent | Depends on |
|---|---|---|---|
| 0 | `mocks/core/errors.ts` (`unprocessable`) | orchestrator | — |
| 1 | **Shipment** module: full drill + quirks a/b + tests + e2e | `mechanic` | — |
| 2 | **Ticket** module: full drill + quirks a/b/c + tests + e2e | `mechanic` | wave 1 |
| 3 | **Event** module: full drill + heavy a/b/c + tests + e2e | `mechanic` | waves 0, 2 |

Each delegation prompt carries: the exact file list, the reference file to mirror per file, the
entity's spec lines from `entities-benchmark.txt`, the §3 decisions that apply, and the tests it
must include. Each mechanic runs `pnpm typecheck`, `pnpm lint` and `pnpm test:run` itself
(typecheck **before** tests — routes are generated) and does **not** run `pnpm test:e2e`: a
single dev server owns port 3010 and the orchestrator owns that gate. The orchestrator reviews
every delivery against §1–§3 before the next wave starts.

---

## 5. Verification plan

Per module, before it counts as delivered:

1. **Mock-infra spec** (`mocks/domains/<plural>.mock.spec.ts`): default page size 10 + total 24;
   page 3 holds the remaining 4; `q` filters across exactly the documented fields (§3.10);
   `GET` 200/404; `POST` 201 + boolean default; 400 on invalid; 409 on the duplicate unique key;
   `PATCH` partial merge; `DELETE` 204 then 404; state reseeds between tests.
   - Shipment: `POST` without `delivered` → `delivered: false`; `weight: 0` → 400; missing
     `destination.country` → 400; a `PATCH` carrying `destination` replaces it wholesale;
     `PATCH { delivered: true }` on `TRK-1003` (no `shippedAt`) → 400 and the stored row is
     unchanged; the same PATCH with a `shippedAt` → 200; `PATCH { delivered: true }` on
     `TRK-1001` (has `shippedAt`) → 200.
   - Ticket: `POST` without `open` → `open: true`; `priority: 4` → 400; `openedAt: 'nope'` →
     400; `?from=2024-02-01&to=2024-02-28` → 8; `?from=2024-01-03&to=2024-01-05` → 3;
     one-sided `?to=2024-01-08` → 8 and `?from=2024-03-01` → 8; a malformed bound is ignored
     (→ 24); the range combines with `q`.
   - Event: `POST` with `published: true` in the body still stores `false`; `seats: -1` → 400;
     `PATCH { published: true }` on `annual-summit` → 200 + `published: true`;
     on `charity-gala` → **422** with `Cannot publish an event that starts in the past`;
     on `beta-launch` → **422** with `Cannot publish an event with no seats`;
     `PATCH { published: false }` on `design-review` → 200 (never guarded);
     `?status=published` → 8, `?status=draft` → 16, unknown value → 24; `?status` combines
     with `q`.
2. **Section tests** (`src/features/<plural>/presentation/*.test.tsx`): list renders page 1 from
   the API, search filters, Next → "Page 2 of 3", row-menu delete with confirmation removes the
   row; form shows validation errors on empty submit without navigating, creates and returns to
   the list, surfaces the server conflict on a duplicate key.
   - Shipment (a) switching `Delivered` on with an empty `Shipped at` → "Shipped at is required
     when the shipment is delivered" under the field, no navigation, no toast; filling the date
     then submits successfully. (b) selecting two deliverable rows shows "2 selected", "Mark
     delivered" updates both, fires exactly **one** toast reading `2 shipments updated`, and the
     rows now show the delivered badge; selecting `TRK-1003` (no `shippedAt`) together with a
     deliverable row produces the single mixed toast `1 of 2 shipments updated` and leaves
     `TRK-1003` still selected; the bar is absent when nothing is selected. Also assert the
     nested `City` column renders `Rotterdam` for `TRK-1001`.
   - Ticket (a) the Priority column shows `High`/`Low`, never `3`/`1`. (b) typing `2024-02-01`
     and `2024-02-28` into the From/To inputs puts both in `router.state.location.search` and
     narrows the list to 8; clearing From restores the wider set. (c) the row menu's third item
     reads `Close` for 4001 and `Reopen` for 4002; choosing it flips the row's status badge and
     toasts `Ticket #4001 closed`.
   - Event (a) `/events/new` renders **no** `published` control (`queryByLabelText('Published')`
     is null) and neither does `/events/$slug/edit`. (b) on `/events/charity-gala`, clicking
     `Publish` leaves the badge on `Draft` and renders
     `Cannot publish an event that starts in the past` as a persistent `role="alert"`;
     on `/events/beta-launch` the reason is the seats one; on `/events/annual-summit` the badge
     flips to `Published`, the button becomes `Unpublish`, and the success toast appears.
     (c) choosing `Draft` in the Status filter puts `status: 'draft'` in
     `router.state.location.search` and narrows the list to 16; back to `All` restores 24.
3. **E2E** (`e2e/<plural>.spec.ts`, mirroring `e2e/payments.spec.ts`): list + pagination,
   search, create, detail + edit, delete with confirmation, duplicate-key server error, each
   entity's quirks, and an axe scan of the list and `/new` pages asserting zero
   serious/critical violations. Shipment's e2e fills `getByLabel('City', { exact: true })`
   (trap 1) and covers the bulk bar end to end; Event's covers a rejected publish and a
   successful one.
4. **Gates** — the orchestrator runs, in the foreground, until all four are green:
   `pnpm typecheck && pnpm lint && pnpm test:run && pnpm test:e2e`.
   Expected final counts: 13 mock specs, 25 section-test files, 13 e2e specs.

---

## 6. Execution record

Waves ran in the planned order: 0 (orchestrator: `unprocessable()` in `mocks/core/errors.ts`) →
1 (Shipment, `mechanic`) → 2 (Ticket, `mechanic`) → 3 (Event, `mechanic`). Each delivery was
reviewed against §1–§3 before the next wave started; no plan deviations were needed and no
mechanic made a design call of its own.

Resolutions the mechanics reported, all consistent with §3:

- **The bulk action needed no new shared surface.** `Promise.allSettled` + the three outcome
  strings (§3.2) held exactly as specified, and the quirk (a)/(b) interaction is real and
  tested: selecting `TRK-1003` (no `shippedAt`) beside a deliverable row produces the single
  mixed toast `1 of 2 shipments updated` and leaves `TRK-1003` checked for a retry. The
  `selectedOnPage` derivation removed any need for a reconciling `useEffect`.
- **`z.literal([1, 2, 3], 'Priority is required')`** typechecked and resolved on the installed
  zod 4.4.3 (verified by the orchestrator before planning it), and the numeric `Select`
  adaptation at the `Controller` boundary worked first try — the batch-3 §3.2 edge-conversion
  shape transfers unchanged from a combobox to a `Select`.
- **The date range needed no change to `src/shared/api/pagination.ts`.** `toQueryString`'s
  `extra` already carries two keys and skips `undefined`, so quirk (b) is pure composition.
- **The publish workflow stayed inside the five-route contract.** `eventsApi.setPublished` and
  `eventsApi.update` both `PATCH /events/:slug` under the single `UPDATE_EVENT` key, and
  `eventUpsertSchema = eventSchema.omit({ published: true })` keeps `published` off every form
  by construction rather than by convention — `queryByLabelText('Published')` is null on both
  `/events/new` and `/events/$slug/edit`.
- **422 flows through `ApiError` untouched**; the asymmetric feedback of §3.8 (success → toast,
  failure → persistent inline `role="alert"`) means the guard's reason is a single DOM node, so
  the detail-page tests assert on it without ambiguity.
- Mechanic-chosen details where the plan was deliberately silent: `DeliveredBadge` and
  `OpenBadge` copy (mirroring `ConfirmedBadge`'s Delivered/Pending, Open/Closed), the mock's
  per-field 400 message wording (mirroring `payments.mock.ts`/`warehouses.mock.ts`), and the
  non-pinned fixture rows.

**Orchestrator fixes after reviewing the deliveries:**

1. `shipments-page.tsx` / `shipment-detail-page.tsx` — the delete-confirmation copy used straight
   quotes around the tracking code; every other string-keyed module uses the typographic
   `“…”`. Aligned.
2. `events.mock.ts` — the `PATCH` handler stored the merged object directly. Replaced with the
   tree's idiom: an explicitly constructed, trimmed `Event` (as every other domain's `PATCH`
   does), so a title with surrounding whitespace cannot enter the store through an edit.
3. `e2e/events.spec.ts` — the successful-publish test asserted `getByText('Published')`, which
   Playwright resolved to three nodes: the badge, the `Unpublish` button, and the success toast.
   This is trap 1 (substring matching) in a new guise — "Published" is a substring of
   "Unpublish". Fixed with `{ exact: true }` plus a comment recording why it is load-bearing.
   **New trap for batch 5**: any status word that is also a substring of its own toggle button
   needs an exact matcher.

**Final gate run (orchestrator, foreground)** — all four green:

| Gate | Result |
|---|---|
| `pnpm typecheck` | pass |
| `pnpm lint` | pass (oxlint, no findings) |
| `pnpm test:run` | 40 files / 348 tests passed |
| `pnpm test:e2e` | 110 tests passed (shipments 10, tickets 11, events 9 added to batch 3's 80) |

Delivered: 13 mock specs, 27 section-test files, 13 e2e specs — Batch 4 is done.
Shapes established here for batch 5: the row-menu PATCH-and-invalidate action
(`useSetTicketOpen` — Subscription's "Renew" is the same shape with an increment instead of a
toggle), the upsert schema that omits a stored field and the detail-page workflow action pair
(the nearest precedents for Subscription's plan-locked edit), and the numeric-value adaptation
at a form-control boundary. The bulk-selection machinery is deliberately entity-local and has
no consumer in batch 5.
</content>
</invoke>
