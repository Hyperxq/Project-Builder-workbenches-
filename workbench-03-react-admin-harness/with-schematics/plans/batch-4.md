# Batch 4 — Shipment [T2], Ticket [T2], Event [T3]

Orchestrated per `HARNESS.md`. Authority on architecture: `AGENTS.md`. Design
language: `DESIGN.md`. Plan directives incorporated:
`plan-directives/schematics.md` (decisions recorded under **Schematic
decisions**, §3).

Baseline measured by me before planning, in the foreground, all four gates:

| Gate | Baseline |
|---|---|
| `pnpm typecheck` | ✅ exit 0 |
| `pnpm lint` | ✅ exit 0 |
| `pnpm test:run` | ✅ 32 files / 242 tests |
| `pnpm test:e2e` | ✅ 75 passed (36.1s) |

Every gate is green today, so any red during this batch is ours.

Batch 4 is the **last batch before the schedule's tail**: after it, only
Subscription [T3] and Employee [T3] remain (batch 5). That arithmetic decides
every schematic question in §3 — directive rule 1 requires **3 or more repeats
ahead**, and no mechanism introduced in this batch has more than one.

---

## 1. Modules

### 1.1 Shipment [T2] — `shipments`, key `trackingCode: string`

| Field | Type / rules |
|---|---|
| `trackingCode` | string, required, **unique** (lookup key) |
| `weight` | number, required, **> 0** |
| `shippedAt` | date (`YYYY-MM-DD`), optional* — *required when `delivered`* |
| `delivered` | boolean, required, default `false` |
| `destination` | **embedded**, required |
| `destination.street` | string, required |
| `destination.city` | string, required |
| `destination.country` | string, required |

Files:

```
mocks/fixtures/shipments.fixture.ts             24 rows (3 real pages)
mocks/domains/shipments.mock.ts                 shipmentHandlers() + resetShipments()
mocks/domains/shipments.mock.spec.ts
mocks/core/types.ts                             + 5 route keys                [generated edit]
mocks/handlers.ts                               + import/spread               [generated edit]
mocks/setup-test-mocking.ts                     + resetShipments()            [generated edit]
src/features/shipments/domain/shipment.ts       shipmentSchema, shipmentUpsertSchema,
                                                shipmentFormSchema, shipmentKey()
src/features/shipments/infrastructure/shipments.api.ts                        [generated]
src/features/shipments/application/use-shipments.ts                           [generated]
src/features/shipments/application/use-bulk-deliver-shipments.ts              (§1.1b)
src/features/shipments/presentation/shipments-page.tsx
src/features/shipments/presentation/shipment-form.tsx
src/features/shipments/presentation/shipment-create-page.tsx                  [generated]
src/features/shipments/presentation/shipment-edit-page.tsx                    [generated]
src/features/shipments/presentation/shipment-detail-page.tsx
src/features/shipments/presentation/delivered-badge.tsx
src/features/shipments/presentation/shipments-page.test.tsx
src/features/shipments/presentation/shipment-form.test.tsx
src/routes/shipments/index.tsx  new.tsx  $trackingCode/index.tsx  $trackingCode/edit.tsx  [generated]
src/app/shell/app-sidebar.tsx                   + NAV line (icon `Truck`)     [generated edit]
src/routes/index.tsx                            + overview card               [generated edit]
e2e/shipments.spec.ts
```

Reference to mirror: **Invoice** for the embedded object and **Payment** for the
conditional; Shipment is the recombination of those two declared rules plus one
genuinely new mechanism (the bulk bar).

List columns: *(checkbox)* · Tracking code (link to detail) · Weight · City
(`destination.city`) · Shipped (`YYYY-MM-DD`, `—` when unset) · Delivered
(badge) · row actions. Sort by `trackingCode` ascending (`localeCompare`); `q`
searches `trackingCode | destination.street | destination.city |
destination.country` — the non-date string fields, per the rule Book set
(`books.mock.ts:64-68` excludes `publishedAt` because other strings exist).

Decisions (mine — the mechanic implements, never decides):

- **EMBEDDED `destination`** — mirror Invoice's `billing` verbatim, which is
  itself Warehouse's declared rule: `destinationSchema = z.object({ street,
  city, country })` nested as one line (`invoice.ts:41-45,55`); `FieldSet` +
  `FieldLegend` ("Destination") wrapping the unchanged per-field `space-y-2` +
  `Label` + `Input` + `<p role="alert">` idiom with nested RHF names
  (`register('destination.city')`) and nested error reads
  (`errors.destination?.city`) — `invoice-form.tsx:135-179`; mock
  `validateDestination` walking the object and naming the failing nested field
  (`invoices.mock.ts:40-48`); PATCH **replaces the whole embedded object as a
  value**, never a field-by-field merge (`invoices.mock.ts:127-133`, comment
  included); `resetShipments()` deep-copies it
  (`invoices.mock.ts:32`); detail page gives it its own labelled block. All
  three fields are plain required strings, so — as with `billing` — none of
  Warehouse's bounded-number handling applies.
- **(a) CONDITIONAL `shippedAt` when `delivered`** — this is the repeat batch 3
  declared (`plans/batch-3.md:227-229,793-795`). Mirror `payment.ts:53-90`
  exactly, with names substituted:
  - `shipmentUpsertSchema = shipmentSchema.extend({ delivered: z.boolean().optional() })`
    — the plain wire shape, what `shipmentsApi` sends, still `.extend()`-able.
  - `shipmentFormSchema = shipmentUpsertSchema.superRefine((value, ctx) => { if
    (value.delivered && !value.shippedAt) ctx.addIssue({ code: 'custom', path:
    ['shippedAt'], message: SHIPPED_REQUIRED_MESSAGE }) })` with
    `SHIPPED_REQUIRED_MESSAGE = 'Shipped date is required when the shipment is
    delivered'`. **Both** the create and the edit form resolve against
    `shipmentFormSchema`, unconditionally, with no create/edit branch.
  - The form registers `shippedAt` with the established `'' → undefined`
    `setValueAs` idiom (`payment-form.tsx:126-134`, from `book-form.tsx:91-94`),
    so the refinement always sees `undefined`, never `''`.
  - Server side the rule lives **inside `validateUpsert`**, which POST checks on
    the body and PATCH checks on the **merged** body, so it holds on both verbs
    (`payments.mock.ts:52-69,103,127`). Message: `shippedAt is required when
    delivered is true`.
- **(b) BULK ACTION** — genuinely new (§2.3); every piece below is my decision:
  - **Selection state** is local `useState<Set<string>>` of `trackingCode`s in
    `shipments-page.tsx`. It is **not** in the URL (the spec does not ask for
    it, and the list's URL contract stays `page`/`q`).
  - **Selection is intersected with the visible page at read time**:
    `const selectedRows = data.items.filter((s) => selected.has(s.trackingCode))`.
    Everything — the bar's visibility, its count and the PATCH fan-out — derives
    from `selectedRows`, never from the raw `Set`. This is what makes paging or
    searching away from a selected row harmless **without** an effect that
    clears state: a row you cannot see can never be mutated. No `useEffect` is
    introduced.
  - **Controls**: a leading `TableHead` holds a "select all on this page"
    `Checkbox` (`aria-label="Select all shipments on this page"`, `checked` when
    every visible row is selected), and each row a `Checkbox`
    (`aria-label={`Select shipment ${trackingCode}`}`). This is the first use of
    `src/components/ui/checkbox.tsx` in the tree.
  - **The bar** renders only when `selectedRows.length > 0`, above the table:
    `{n} selected` + a `Mark delivered` `Button` (`size="sm"`). It is a plain
    `div` with `role="status"` so the count is announced.
  - **The fan-out lives in the application layer**, not the page:
    `use-bulk-deliver-shipments.ts` exports `useBulkDeliverShipments()`, a
    `useMutation` whose `mutationFn` takes `Shipment[]` and runs
    `Promise.allSettled(shipments.map((s) => shipmentsApi.update(s.trackingCode,
    { delivered: true, shippedAt: s.shippedAt ?? todayIso() })))`, returning
    `{ updated, failed }`. `onSuccess` invalidates `shipmentKeys.all`.
    - **Why a sibling file and not an edit to the generated `use-shipments.ts`**:
      the directive forbids silently patching generated output, and the generated
      hooks file is a fixed template. A new, entity-specific use case gets its own
      file in the same layer — the generated file is left byte-identical to what
      the schematic wrote. This is recorded here so the deviation is explicit,
      not silent.
    - **Why the payload carries `shippedAt`**: quirk (a) makes `shippedAt`
      required whenever `delivered` is true, on **both** verbs, so a bare
      `{ delivered: true }` PATCH would 400 for any row that was never shipped.
      The bulk action therefore supplies `todayIso()` for rows that have no
      `shippedAt`, and leaves an existing value untouched. The two quirks are
      consistent by construction rather than by accident.
    - **Why `allSettled`**: one failing row must not abort the others. The hook
      counts outcomes; it never throws for a partial failure.
  - **One toast**: on settle, `toast.success(`${updated} shipments updated`)`
    when `updated > 0`, and additionally `toast.error(`${failed} shipments could
    not be updated`)` when `failed > 0`. Never one toast per row — that is the
    point of the quirk. Selection is cleared after the mutation settles.
  - **No confirmation dialog** — this is the bulk form of the instant row
    mutation batch 3 declared (`plans/batch-3.md:796-798`); dialogs stay with
    delete.
- `delivered-badge.tsx` mirrors `confirmed-badge.tsx` exactly: `bg-success` dot
  + **Delivered**, `bg-muted-foreground` dot + **Pending**.
- `weight` uses the established single-message convention:
  `WEIGHT_MESSAGE = 'Weight must be greater than 0'` passed as the base
  `z.number()` error **and** to `.gt(0, …)`, so a blank input reads that message
  instead of "expected number, received NaN". Input `type="number"`
  `step="0.01"`, `valueAsNumber: true`.
- Fixture: 24 rows, deterministic, fixed literal dates (never `todayIso()`) —
  exactly **9 delivered**, every one of them carrying a `shippedAt` (the fixture
  must satisfy the entity's own conditional rule), and of the 15 undelivered at
  least **6** carry `shippedAt: undefined` so both the `—` cell and the bulk
  action's `todayIso()` branch are reachable. Tracking codes are uppercase and
  already in ascending order. At least three rows share one
  `destination.city` so the `q` test can narrow to a known count.

### 1.2 Ticket [T2] — `tickets`, key `ticketNumber: number`

| Field | Type / rules |
|---|---|
| `ticketNumber` | number, required, integer, **unique** (lookup key) |
| `subject` | string, required |
| `priority` | numeric enum `1` \| `2` \| `3`, required |
| `openedAt` | date (`YYYY-MM-DD`), required |
| `open` | boolean, required, default `true` |

Same file set as Shipment with `ticket`/`tickets`, key param `$ticketNumber`,
plus `presentation/priority-badge.tsx` and
`presentation/ticket-open-toggle-item.tsx`; the boolean badge is
`presentation/open-badge.tsx`. Sidebar/overview icon `Ticket`.

List columns: Ticket # (link) · Subject · Priority (badge) · Opened
(`YYYY-MM-DD`) · Status (badge) · row actions. Sort by `ticketNumber`
ascending; `q` searches `subject` (the entity's only non-date string field).

Quirk decisions (mine):

- **Numeric enum in the domain.** `z.enum()` is string-literal only, so
  `priority` uses Zod v4's literal-array form — **verified present in the
  installed zod 4.4.3** at `node_modules/zod/v4/classic/schemas.d.cts:585`
  (`literal<const T extends ReadonlyArray<util.Literal>>(value: T, params?:
  string | …)`):
  ```ts
  export const ticketPriorities = [1, 2, 3] as const
  priority: z.literal(ticketPriorities, PRIORITY_MESSAGE)
  ```
  with `PRIORITY_MESSAGE = 'Priority is required'` — the same single-message
  convention bounded numbers use, so an unselected Select reads that instead of
  a type-error leak. This mirrors `paymentMethods` + `z.enum(paymentMethods)`
  (`payment.ts:29,34`) one-for-one, differing only in the literal kind.
- **Labels live in the domain**, per the rule Payment set (`payment.ts:44-51`):
  `TICKET_PRIORITY_LABELS: Record<TicketPriority, string> = { 1: 'Low', 2:
  'Medium', 3: 'High' }`, consumed by the form Select, the list badge and the
  detail page. **The raw number is never rendered** — this is quirk (a)'s
  explicit requirement.
- **(a) PRIORITY BADGE.** `priority-badge.tsx` mirrors `coupon-status-badge.tsx`
  (the only existing three-state badge): `Badge variant="outline"` + a
  `size-1.5 rounded-full` dot. Dot tones — **checked against the actual token
  set in `src/index.css:34-68`; there is no `--warning` token, so none is
  invented**: `3 → bg-destructive`, `2 → bg-foreground`, `1 →
  bg-muted-foreground`. `--primary` is deliberately not used: DESIGN.md reserves
  it for focus rings and intentional CTAs (`src/index.css:19`).
  To make the spec's "High uses the destructive tone" unambiguous rather than a
  1.5px dot, the **High badge also carries `text-destructive`** on the `Badge`
  itself: `className={cn('gap-1.5 text-xs font-normal', priority === 3 &&
  'text-destructive')}`. `Badge variant="destructive"` is **not** used — no badge
  in the tree passes any variant but `outline`, and breaking that for one entity
  would read as a different component, not a different tone.
- **Enum in a FORM.** `priority` renders as a `Select` bound through RHF
  `Controller`, mirroring `payment-form.tsx`'s Method field. Two mandatory
  details, both learned in batch 3 (`plans/batch-3.md:760-766`):
  - the Select is **controlled from the first render** — `value={field.value ?
    String(field.value) : ''}` — so React never logs the
    uncontrolled→controlled warning. This is applied **from the start**, not
    discovered in VERIFY.
  - the Select's values are strings on the wire and numbers in the schema:
    `onValueChange={(value) => field.onChange(Number(value))}`, `SelectItem
    value="1|2|3"` labelled from `TICKET_PRIORITY_LABELS`.
- **(b) DATE RANGE FILTER.** Two URL params, one compound filter — the first
  two-param filter in the tree (§2.6). Route `validateSearch` gains, via the
  unchanged `extraSearch` input:
  ```
  from: z.string().default('').catch(''),
  to: z.string().default('').catch(''),
  ```
  `''`-defaulted like `q` (not `.optional()`), so every `navigate({ search })`
  object stays complete and mirrors the proven search-param shape. The page
  forwards `filters: { from: from || undefined, to: to || undefined }`, so an
  empty box never reaches the wire (`toQueryString` also drops `''`,
  `pagination.ts:26-29` — belt and braces). Controls: two
  `<Input type="date">` in the toolbar, `aria-label="Opened from"` /
  `aria-label="Opened to"`; changing either **resets `page` to 1**, preserves
  `q` and the other bound, and uses `replace: true` — Coupon's proven wiring
  (`coupons-page.tsx:114-134`) with a date input in place of the Select.
  Endpoint side, `parseRange(url)` reads both params, ignores anything not
  matching `/^\d{4}-\d{2}-\d{2}$/`, and filters **before pagination** so `total`
  reflects the filtered set (`payments.mock.ts:79-80` ordering). Bounds are
  **inclusive** on both ends; comparison is plain string `<=`/`>=`, which is
  exact for `YYYY-MM-DD` (lexicographic order is chronological order) — the same
  comparison `couponStatus` already relies on (`coupons.mock.ts:46`).
- **(c) ROW ACTION Close/Reopen.** A **third** `DropdownMenuItem` in the row
  menu — no row menu in the tree has had one, so its placement is my decision:
  it sits **first**, above `Edit`, with `Delete` still last and still the only
  `variant="destructive"` item. Because each row needs its own
  `useUpdateTicket(ticketNumber)` instance (hooks are never called in a loop),
  it is a per-row component, `ticket-open-toggle-item.tsx`, exactly as
  `invoice-paid-switch.tsx:21-37` is:
  - label and action derive from the row: `open ? 'Close' : 'Reopen'`,
    `mutate({ open: !ticket.open })`.
  - `onSelect` fires the mutation directly — **no confirmation dialog, no
    navigation**, per the declared inline-row-PATCH rule
    (`plans/batch-3.md:796-798`).
  - **Unlike Invoice's switch, success is not silent**: the spec says "PATCH +
    toast", so `onSuccess: toast.success(`Ticket ${n} closed|reopened`)` and
    `onError: toast.error(error.message)`. Recorded as a deliberate, spec-driven
    divergence from the Invoice instance of the same rule.
  - page/`q`/filter state is preserved structurally, not restored: the item
    never navigates, and the generated `onSuccess` invalidates `ticketKeys.all`
    so the list refetches the same URL-derived key.
- `open-badge.tsx` mirrors `confirmed-badge.tsx`: `bg-success` + **Open** /
  `bg-muted-foreground` + **Closed**.
- Fixture: 24 rows, deterministic, fixed literal dates — exactly **8 Low / 9
  Medium / 7 High** and **15 open / 9 closed**; `openedAt` values are spread so
  that a known, asserted count falls inside one bounded window (the mock spec and
  the section test both use `from=2024-03-01&to=2024-04-30`) and rows exist
  strictly outside both bounds. Tests assert the 8/9/7 split and the windowed
  count.

### 1.3 Event [T3] — `events`, key `slug: string`

| Field | Type / rules |
|---|---|
| `slug` | string, required, **unique** (lookup key) |
| `title` | string, required |
| `startsAt` | date (`YYYY-MM-DD`), required |
| `seats` | number, required, integer, **min 0** |
| `published` | boolean, required, default `false` — **never in a form** |

Same file set as Shipment with `event`/`events`, key param `$slug`, plus
`presentation/event-status-badge.tsx` and
`presentation/event-publish-actions.tsx`. Sidebar/overview icon `CalendarDays`.
Plus the batch's **one shared edit**: a `422` helper in `mocks/core/errors.ts`.

List columns: Slug (link) · Title · Starts (`YYYY-MM-DD`) · Seats · Status
(badge) · row actions. Sort by `slug` ascending (`localeCompare`); `q` searches
`slug | title`.

Heavy-workflow decisions (mine):

- **(a) `published` NEVER IN A FORM — the two-schema split.** The domain exports
  three schemas, deliberately shaped so the generated layers need **zero**
  changes (§2.9):
  ```ts
  export const eventSchema = z.object({ slug, title, startsAt, seats, published: z.boolean() })
  /** Wire payload: `published` stays OPTIONAL so PATCH { published } typechecks. */
  export const eventUpsertSchema = eventSchema.extend({ published: z.boolean().optional() })
  /** Form values: `published` is structurally ABSENT — a form cannot express it. */
  export const eventFormSchema = eventUpsertSchema.omit({ published: true })
  export type EventUpsert = z.infer<typeof eventUpsertSchema>
  export type EventFormValues = z.infer<typeof eventFormSchema>
  ```
  - `EventUpsert` is what `eventsApi`/`use-events.ts` are generated against
    (`crud-hooks` emits `mutationFn: (payload: Partial<EventUpsert>) =>
    eventsApi.update(...)`), so `useUpdateEvent(slug).mutate({ published: true })`
    typechecks with **no schematic change and no patch to generated output**.
  - `EventForm` resolves against `eventFormSchema` and its `onSubmit` is typed
    `(values: EventFormValues) => void`. `EventFormValues` has no `published`
    key at all, so the guarantee is enforced by the **type system**, not by
    remembering not to render a control. The generated create/edit pages pass
    that value straight into `mutate` — assignable, since `published` is
    optional on the wire.
  - This is the same two-schema split Payment declared (one wire schema, one
    form schema); `.omit()` replaces `.superRefine()`. **Declared the rule for
    Subscription's "edit cannot change plan"** (batch 5).
  - Mock POST **ignores any `published` in the body and always stores `false`** —
    the field is not user-settable at creation by construction, applying the
    established `body.x ?? false` create-default idiom
    (`payments.mock.ts:112`) in its strictest form.
- **(b) PUBLISH GUARD → 422.** The mock is the authority; the UI shows what it
  says.
  - `mocks/core/errors.ts` gains a fifth helper mirroring the existing four
    verbatim: `unprocessable(message = 'Unprocessable entity')` → status **422**.
    This is the first 422 in the tree (§2.10). `src/shared/api/client.ts` is
    status-agnostic, so **no client-side plumbing changes**.
  - The guard lives in the PATCH handler and fires **only when the body
    explicitly sets `published: true`** — i.e. on the publish transition.
    Unpublishing is always allowed; an ordinary edit of an already-published
    event is not re-guarded (the spec guards *publishing*).
  - It runs against the **merged** record, checked in this order:
    1. `merged.startsAt < todayIso()` → `Cannot publish an event that has
       already started`
    2. `merged.seats === 0` → `Cannot publish an event with no seats`

    `todayIso()` is called at request time, never baked into the fixture
    (`coupons.mock.ts:46,102` is the precedent).
  - The guard is checked **before** the normal `validateUpsert`/400 path so the
    422 is never masked by a 400.
- **Publish/Unpublish UI.** `event-publish-actions.tsx` renders next to
  Edit/Delete in the detail-page header: one `Button variant="outline"
  size="sm"` reading **Publish** when `published` is false and **Unpublish**
  when true, firing `useUpdateEvent(slug).mutate({ published: !event.published })`
  — instant, no dialog, no navigation (the declared inline-PATCH rule, applied
  from a detail-page button).
  - **The reason is surfaced twice, deliberately** (§2.10 found no precedent for
    a detail-page action's error channel): a `toast.error(error.message)` for
    immediacy — mirroring the detail page's own Delete `onError`
    (`payment-detail-page.tsx:35`) — **and** a persistent inline
    `<p role="alert" className="text-sm text-destructive">` under the header,
    fed by `publish.error instanceof ApiError ? publish.error.message :
    undefined`, mirroring the form `serverError` idiom
    (`invoice-form.tsx:192-196`). A toast that has already faded is not "the UI
    shows the reason"; the inline alert is what the tests assert on.
  - Success is silent apart from the badge flipping (the spec asks for a
    rejection reason, not a success announcement).
- **(c) STATUS FILTER + BADGE.** `status: z.enum(['all','published','draft'])
  .default('all').catch('all')` via `extraSearch`; the page forwards
  `filters: { status: status === 'all' ? undefined : status }` so `?status=all`
  never reaches the wire; the **endpoint** applies it before pagination so
  `total` reflects the filtered set. Control: shadcn `Select`, `size="sm"`,
  `aria-label="Filter by status"`, `replace: true`, resets `page` to 1 and
  preserves `q` — Coupon's/Payment's proven wiring verbatim
  (`payments-page.tsx:116-134`, `payments.mock.ts:39-45,79-80`).
  `event-status-badge.tsx` is a two-state badge mirroring `confirmed-badge.tsx`:
  `bg-success` + **Published** / `bg-muted-foreground` + **Draft**.
- `seats` uses the single-message convention: `SEATS_MESSAGE = 'Seats must be a
  whole number of 0 or more'`, passed as the base `z.number()` error and to
  `.int()`/`.min(0)`.
- Fixture: 24 rows, deterministic, **fixed literal dates** in the Coupon style
  (`coupons.fixture.ts:6-15`: past = 2023, future = 2099 — never computed from
  today, so the guard's verdict is stable forever) — exactly **9 published / 15
  draft**, slugs already in ascending order, and the draft set contains all
  three guard cases explicitly:
  - ≥1 draft with a **2023** `startsAt` and `seats > 0` → publish must 422 on
    the date,
  - ≥1 draft with a **2099** `startsAt` and `seats === 0` → publish must 422 on
    the seats,
  - ≥1 draft with a **2099** `startsAt` and `seats > 0` → publish must succeed.

### 1.4 Shared changes (mine, cross-cutting)

1. **`mocks/core/errors.ts`** — one added helper, `unprocessable(message =
   'Unprocessable entity')` returning `HttpResponse.json({ error: message }, {
   status: 422 })`, byte-mirroring the four helpers already there
   (`errors.ts:11-25`). Only the events domain calls it. This is the **only**
   shared-file edit in the batch and the only file any two delegations could
   have contended for — it is assigned exclusively to M3.

No other shared file changes. `ListParams.filters` already carries Ticket's
`from`/`to` and Event's `status` as strings with zero changes
(`pagination.ts:17`); `mocks/core/list-query.ts`,
`src/shared/domain/iso-date.ts` (all three entities use it) and
`src/shared/format/currency.ts` (unused this batch — no money field) are reused
or untouched; every shadcn primitive needed (`checkbox`, `select`, `switch`,
`field`, `table`, `dropdown-menu`) already exists, `checkbox` for the first time
as an importer.

---

## 2. Pattern inventory (scout report, incorporated)

Read-only sweep by the `scout` sub-agent over `AGENTS.md`, `DESIGN.md`,
`entities-benchmark.txt`, all three prior plans, `plan-directives/schematics.md`,
all 10 schematics (`schema.json` + `factory.ts` + `helper.ts`), `mocks/core/*`,
all 10 mock domains + fixtures + specs, `src/shared/**`, all 10 feature stacks,
`src/test/*` and `src/components/ui/*`. Findings I verified myself are marked ✔.

### 2.1 Baseline module shape — generated vs hand-written

`default:crud-module` (`crud-module/factory.ts:25-38`) composes nine atomics in
one call: `crud-api` → `crud-hooks` → `crud-routes` → `crud-create-page` →
`crud-edit-page` → `mock-route-keys` → `mock-domain-register` →
`sidebar-nav-entry` → `overview-card`. Its inputs are `singular, plural,
keyField, keyType, label, icon, description, title, extraSearch, labelField`
(✔ `crud-module/schema.json:2-67`).

**Hand-written, always**: fixture, mock domain factory + spec, domain schema,
`<singular>-form.tsx`, `<plural>-page.tsx`, `<singular>-detail-page.tsx`,
section tests, e2e spec. That is batch 3's **closed** verdict
(`plans/batch-3.md:494-546,587-588`), not a question this batch reopens.

Batch 4 is repeats #11–13 of the create/edit-page schematics extracted in batch
3; batch 5 supplies the last two.

### 2.2 Shipment — embedded `destination` (instance #3 of 3)

Warehouse `location` (#1, the declared rule) and Invoice `billing` (#2) were
compared layer by layer:

| Layer | Warehouse | Invoice | Identical? |
|---|---|---|---|
| Nested schema | `warehouse.ts:28-33` (4 fields, 2 bounded numbers) | `invoice.ts:41-45` (3 plain strings) | Same `z.object({…})`; Invoice is a strict subset |
| Nesting site | `warehouse.ts:41` | `invoice.ts:55` | One line, identical |
| Form fieldset | `warehouse-form.tsx:92-152` | `invoice-form.tsx:135-179` ✔ | Byte-identical modulo field names/count; Warehouse alone adds `valueAsNumber` + bound messages |
| Mock nested validator | `validateLocation`, `warehouses.mock.ts:47-70` | `validateBilling`, `invoices.mock.ts:40-48` ✔ | Byte-identical control flow (`!x \|\| typeof x !== 'object'` → per-field `if` → `null`) |
| PATCH replace | `warehouses.mock.ts:138-144` | `invoices.mock.ts:127-133` ✔ | Byte-identical, comment included |
| Detail block | `warehouse-detail-page.tsx:95-116` | same shape | Identical |

Shipment's `destination` (three plain required strings) is an even closer subset
than `billing`. **Repeats ahead after Shipment: zero** — neither Subscription nor
Employee has an embedded field (`entities-benchmark.txt:191-222`). Extraction
verdict in §3.

### 2.3 Shipment — bulk action

**No precedent anywhere.** `src/components/ui/checkbox.tsx` exists with **zero
importers**; no page holds row-selection state; no code fans a mutation out over
several rows or aggregates outcomes into one toast. The nearest proven shape is
the *single*-row instant PATCH (`invoice-paid-switch.tsx:21-37` ✔), whose
declared rule (`plans/batch-3.md:796-798`) covers the mutation core but
explicitly leaves the trigger control per entity.

Also new: the generated `useUpdate<Singular>(key)` binds its key **at hook
level** (✔ `use-payments.ts:44-51`), so it cannot serve a fan-out over N rows —
hence the sibling hook in §1.1b. Repeats ahead: **zero**.

### 2.4 Ticket — numeric enum + badge

- No numeric enum exists; the only enum is Payment's **string** enum
  (`payment.ts:29,34`). `z.enum` cannot express `1|2|3`. ✔ zod 4.4.3 does
  support the literal-array form (`schemas.d.cts:585`), which is the closest
  analogue of the proven `z.enum(paymentMethods)` line.
- Label-map-in-the-domain is Payment's declared rule (`payment.ts:44-51`).
- **All seven `*-badge.tsx` components** use `Badge variant="outline"` + a
  colored dot; `variant="destructive"` appears ~50 times in the tree but
  **never on a `Badge`** — only on `Button`/`AlertDialogAction`.
  `coupon-status-badge.tsx:12-29` ✔ is the only three-state badge and the
  template to follow.
- ✔ Token check (`src/index.css:34-68`): the palette has `--success`,
  `--destructive`, `--primary`, `--accent`, `--muted-foreground` — **no
  `--warning`**. A Medium tone must come from the existing set (§1.2).

### 2.5 Ticket — row-menu Close/Reopen

Every row menu in all 10 list pages has exactly two items, Edit + destructive
Delete (`payments-page.tsx:206-232` ✔). A third item, and one that mutates
instantly, is new as a *composition*; both halves (the menu, the instant PATCH)
are individually proven. Repeats ahead: **one** — Subscription's "Renew" row
item (batch 5) has the *same* trigger control, so Ticket's shape is declared the
rule for it (§3).

### 2.6 Ticket — date-range filter

Every existing URL filter is **single-valued**: Review `verified` (boolean
Switch), Coupon `status`, Payment `method` (✔ `src/routes/payments/index.tsx:9-13`,
`payments-page.tsx:50-60,116-134`, `payments.mock.ts:39-45,79-80`). The
end-to-end chain transfers per-param, and `ListParams.filters` already takes
string values unchanged (✔ `pagination.ts:9-32`). What is new is only
(i) **two** params driving one compound predicate and (ii) a **date input in a
toolbar** — `grep 'type="date"'` finds five hits, all inside forms, none in a
page toolbar. Repeats ahead: **zero**.

### 2.7 Event — `published` never in a form

No upsert schema in the tree omits a field: every "default" boolean is present
in the form as a `Controller`+`Switch` and merely optional on the wire
(`invoice.ts:61-63`, `payment.ts:54-56` ✔). Omitting one from the **form** type
while keeping it on the **wire** type is new — and is exactly what keeps the
generated api/hooks (typed against `Partial<EventUpsert>`) valid for the publish
PATCH (§1.3a). Repeats ahead: **one** (Subscription's non-editable `plan`).

### 2.8 Event — 422 guard and how errors surface

- ✔ `mocks/core/errors.ts:11-25` has exactly four helpers (404/400/409/500);
  `grep -rn "422" mocks/ src/` returns **zero hits** tree-wide.
- ✔ `ApiError` (`src/shared/api/client.ts`) is status-agnostic — it captures any
  non-2xx `{status, body}` and exposes `body.error` as `.message`, so a 422
  needs **no** client change.
- Two error channels exist, never mixed: **form-level** `serverError` prop →
  `<p role="alert">` above the actions (all 10 forms, ✔
  `invoice-form.tsx:192-196`), used for 400/409 on create/edit; and **toast**
  `onError: (error) => toast.error(error.message)` for row/detail actions and
  every delete (✔ `invoice-paid-switch.tsx:32`,
  `payment-detail-page.tsx:35`).
- A **detail-page action that is not a form and not a delete has no precedent**
  — the channel for Publish's rejection reason is an open decision, resolved in
  §1.3b.

### 2.9 Event — enum status filter (instance #3 of 3)

Batch 3 numbered this exactly (`plans/batch-3.md:438-440,800-801`): Coupon #1,
Payment #2, Event #3, with **zero** repeats after it (batch 5 has no list
filter). Chains to mirror: Coupon (`src/routes/coupons/index.tsx:9-13`,
`coupons-page.tsx:47-58,114-134`, `coupons.mock.ts:40-43,73-77`) and Payment
(✔ cited in §2.6). Both apply the filter **before** `paginate`.

### 2.10 Cross-cutting state

- `MockRouteKey`: **50** literals today (`mocks/core/types.ts:15-64`); batch 4
  adds 15 → **65**.
- `mocks/core/list-query.ts:18-34` — `parseListQuery` + `paginate`, used by all
  10 domains; entity filters are always a local one-liner layered on top.
- ✔ `src/shared/api/pagination.ts:9-32` — `filters?: Record<string, string |
  number | boolean | undefined>`; `toQueryString` drops `undefined` **and**
  `''`. Carries `from`/`to`/`status` unchanged.
- `src/shared/domain/iso-date.ts` — `isoDateSchema`, `optionalIsoDateSchema`,
  `todayIso()` (UTC). All three entities use it; Event's guard and Shipment's
  bulk payload call `todayIso()` at request/action time.
- `src/test/setup.ts:1-28` polyfills `matchMedia`, `ResizeObserver`,
  `scrollIntoView`, and pointer-capture on `Element.prototype` — what makes
  Radix `Select`/`Popover`/`Command` drivable in jsdom. **`Checkbox` has never
  been driven in a section test** (§2.3) — same Radix primitive family, but
  unproven. Hazard 5 below.
- `mocks/setup-test-mocking.ts` resets 10 domains; batch 4 adds three, via the
  generated edit.

### 2.11 Schematic coverage check

All 10 schematics re-read. **None needs extension or a sibling for batch 4:**

- `crud-api` / `crud-hooks` — parameterised only by `singular, plural, keyField,
  keyType` (`crud-api/helper.ts:18-53`, `crud-hooks/helper.ts:16-85`); they never
  inspect other fields. Shipment's embedded object, Ticket's numeric enum and
  Event's form/wire schema split all live in the domain and presentation layers.
  Byte-identity holds. **Event is the one that could have broken this** — it does
  not, because `EventUpsert` keeps `published` optional rather than omitting it
  (§1.3a); had the wire type omitted it, `useUpdateEvent(...).mutate({ published
  })` would not typecheck and the schematic *would* have fallen short. The design
  was chosen to avoid a post-generation patch, per directive rule 3.
- `crud-routes` — `extraSearch` splits raw Zod lines on `\n` and inserts each
  verbatim (`crud-routes/helper.ts:9-15`); it already absorbed a boolean and two
  enums. It takes Ticket's **two** lines and Event's one with no change.
- `crud-create-page` / `crud-edit-page` — fixed wrappers around `<Singular>Form`
  that never enumerate fields; `labelField` only feeds the heading/toast. Event's
  never-expose-`published` rule is enforced inside the hand-written form and the
  domain types, so both generated pages are correct unchanged.
- `mock-route-keys`, `mock-domain-register`, `sidebar-nav-entry`,
  `overview-card` — additive, idempotent text edits, unaffected by field shape.
- `crud-module` — composition order still holds for all three entities.

### 2.12 Hazards carried forward

| # | Hazard | Recorded | Applies to |
|---|---|---|---|
| 1 | Playwright strict-mode locator collisions on short labels that are substrings of longer ones | `plans/batch-1.md:335-338`, `plans/batch-2.md:458-462` | **Shipment** (`City`, `Street`, `Weight`/`Delivered` vs the bulk bar's text) and **Event** (`Seats`, `Title`). `{ exact: true }` is **pre-authorised from the start** on every `getByLabel`/`getByText` in all three e2e specs. |
| 2 | A detail page refetching shows its skeleton first — assert with `findBy*`, never `getBy*`, after a mutation | `plans/batch-2.md:454-457`, `plans/batch-3.md:567` | **Event** (Publish/Unpublish mutates *from* the detail page — the badge flip and the 422 reason are exactly this race) and **Ticket** (if a Close/Reopen assertion lands on the detail page). |
| 3 | Never assert a bare path against a list route with `toHaveURL` — TanStack Router writes search defaults into the URL (`/x?page=1&q=`) | `plans/batch-3.md:750-759` | **Shipment** (the bulk action must not lose page/search state — capture `page.url()` before, assert byte-identity after, per `e2e/invoices.spec.ts:122,127`) and **Ticket** (row action from a filtered list). |
| 4 | A `Select` with no default value logs React's uncontrolled→controlled warning | `plans/batch-3.md:760-766` | **Ticket** — `priority` has no default. Fixed from the start with `value={field.value ? String(field.value) : ''}` (§1.2), not during VERIFY. |
| 5 | jsdom Radix drivability — `Select`/`Popover`/`Command` proven; **`Checkbox` unproven** (first importer) | new, this batch | **Shipment**. Contingency, pre-authorised by me: if `userEvent.click` cannot drive the Radix checkbox, the section test may use `fireEvent.click` on the `role="checkbox"` element. **No change to `src/test/setup.ts` is authorised** without my approval. |

---

## 3. Schematic decisions

Directive: extract from proven code, bottom-up, one schematic per atomic
pattern, composites only from proven pieces, never a master generator. Rule 1
requires a proven instance **and 3 or more repeats ahead**.

**The controlling arithmetic**: after this batch the schedule has **two entities
left** (Subscription, Employee). No mechanism introduced or repeated in batch 4
has three repeats ahead — several have exactly zero. Every "none" below is that
arithmetic, not reluctance.

| Pattern | Established? | Action | Rationale (proven instance · repetitions ahead · variation points) |
|---|---|---|---|
| Module skeleton (api + hooks + routes + create/edit pages + 4 registrations) | ✅ proven ×10 | **use** `default:crud-module` ×3 | 2 repeats remain after this batch. Ticket rides `extraSearch` with two lines, Event with one — the declared, unchanged variation point. Nothing generated is hand-patched. |
| Create page / edit page | ✅ extracted in batch 3, proven ×3 there | **use as-is** (composed inside `crud-module`) | Repeats #11–13. Event needed a design choice (§1.3a) precisely so these stay unpatched. |
| List-route extra search entries | ✅ `extraSearch` proven on Review, Coupon, Payment | **use as-is** | Ticket is the first *two-line* user; the helper splits on `\n` and inserts verbatim (`crud-routes/helper.ts:9-15`), so this is a value, not a change. |
| **Embedded-object fieldset** | ✅ Warehouse (declared rule) + Invoice — instance #3 lands here | **none — decided, not deferred** | This is the batch the extraction question was scheduled for (`plans/batch-3.md:791-793`). The three instances *are* near-byte-identical (§2.2), so the evidence half of rule 1 is satisfied — but **zero** repeats remain in the schedule. A schematic extracted now would be executed **never again**. Rule 1 fails on repetition, not on proof. Hand-mirror Invoice's instance. |
| Sibling-driven conditional required field | ✅ Payment (declared rule, batch 3) | **use the rule by hand** | Shipment is the single forecast repeat; zero remain after it. |
| Inline single-row PATCH (core: instant `mutate` + invalidate + toast, no dialog, no navigation) | ✅ Invoice (declared rule, batch 3) | **use the rule by hand ×3, trigger per entity** | Three different triggers this batch alone (bulk bar, row-menu item, detail-page button), which is precisely why batch 3 declared the *core* and not the control. Ticket's row-menu instance is declared the rule for Subscription's "Renew" (same control, batch 5). |
| Enum Select list filter | ✅ Coupon #1, Payment #2 | **none** | Event is #3 of 3 with zero ahead — the verdict batch 3 already reached (`plans/batch-3.md:590,800-801`), unchanged. |
| Two-schema domain split (wire schema vs form schema) | ✅ Payment (`superRefine`); Event adds the `.omit()` variant | **new variant, built by hand — declared the rule** (directive rule 2) | One repeat ahead: Subscription's edit form cannot change `plan`. Proven-first; extractable only if a third ever appears. |
| Bulk selection + fan-out + aggregated toast | ❌ new | **hand-built, no schematic, not even a declared rule** | Zero repeats ahead — a one-off by construction. |
| Numeric-literal enum + three-state badge | ❌ new (numeric); badge idiom ✅ Coupon | **hand-built** | Zero repeats ahead (Subscription's `plan` is a *string* enum, already covered by Payment's rule). |
| Date-range (two-param) filter | ❌ new | **hand-built** | Zero repeats ahead. |
| 422 mock error helper | ❌ new | **shared function, not a schematic** → `unprocessable()` in `mocks/core/errors.ts` | Same crystallisation call as `formatUsd`/`list-query`: a four-line sibling of four existing helpers is DRY, not a generator. One caller. |
| Detail-page action error channel (toast + persistent inline alert) | ❌ new | **hand-built, decided in §1.3b** | One instance in the schedule. |
| Mock domain factory + fixture | ✅ ×10 | **defer — final** | Unchanged verdict (`plans/batch-3.md:497-509`): still needs the "kind of entity" switch the directive forbids. Batch 4 adds three more distinct shapes (embedded + conditional; numeric enum + range filter; workflow guard), which widens the switch rather than narrowing it. With two entities left, this now closes as *never*. |
| List page / detail page / form | ✅ ×10, chrome only | **none — closed in batch 3** | Not reopened. |
| Section tests / e2e specs / domain schema | ✅ ×10 | **none — permanent** | Assertions and shapes are the per-entity specification. |

Net: **no schematic is created, extended or patched in batch 4.** The existing
ten are executed three times and left untouched — which is itself the directive
working: crystallisation happened when repetition justified it (batch 3), and
stops when repetition runs out.

---

## 4. Delegation plan

Every delegation is a **blocking** `mechanic` call carrying: the exact files to
produce, the reference pattern to mirror (pointed at an existing module), the
entity's spec lines from `entities-benchmark.txt`, and the tests it must
include. I review each delivery against this plan before moving on. Design
decisions stay in this file; the mechanic makes none.

| # | Unit | Depends on | Who |
|---|---|---|---|
| **X1** | `builder execute default:crud-module` for **shipments** — standalone, one shell call. Read every file it wrote/edited. | — | me |
| **X2** | Same for **tickets** (carries the two-line `extraSearch`: `from`, `to`). | X1 | me |
| **X3** | Same for **events** (carries the `status` enum `extraSearch`). | X2 | me |
| **M1** | Shipment module: fixture (24 rows, 9 delivered), mock + spec, domain schema (upsert + form split), list page with the bulk bar, form with the embedded fieldset + conditional, detail page, `delivered-badge.tsx`, `use-bulk-deliver-shipments.ts`, 2 section tests, `e2e/shipments.spec.ts`. | X3 | mechanic |
| **M2** | Ticket module: fixture (24 rows, 8/9/7 priorities), mock + spec with the range filter, domain schema with the numeric literal enum + labels, list page with two date inputs and the third row-menu item, form with the priority Select, detail page, `priority-badge.tsx`, `open-badge.tsx`, `ticket-open-toggle-item.tsx`, 2 section tests, `e2e/tickets.spec.ts`. | X3 | mechanic |
| **M3** | Event module: `unprocessable()` in `mocks/core/errors.ts`, fixture (24 rows, 9 published, all three guard cases), mock + spec with the 422 guard and status filter, domain schema (three-schema split), list page with the status Select, form **without** `published`, detail page with `event-publish-actions.tsx`, `event-status-badge.tsx`, 2 section tests, `e2e/events.spec.ts`. | X3 | mechanic |
| **V** | All four gates + `pnpm test:schematics`; diagnose, fix (mechanical fixes re-delegated), re-run until green. | all | me |

X1–X3 are sequential because each writes to the same four shared registration
files (`mocks/core/types.ts`, `mocks/handlers.ts`,
`mocks/setup-test-mocking.ts`, `src/app/shell/app-sidebar.tsx`,
`src/routes/index.tsx`) and `builder execute` must run standalone, one per shell
call (pbuilder guardrail).

M1, M2 and M3 touch **disjoint** file sets — their own
`src/features/<plural>/**`, `mocks/{fixtures,domains}/<plural>*`,
`e2e/<plural>.spec.ts`, plus `mocks/core/errors.ts` for M3 alone — because X1–X3
have already made every shared edit. They therefore run **in parallel in one
message**, each blocking.

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

**Shipment (T2)** — plus one test per quirk:

- (a) submitting with `delivered` on and `shippedAt` empty shows the field error
  (`SHIPPED_REQUIRED_MESSAGE`) **under Shipped** and does not navigate — on the
  **create** form *and* on the **edit** form (two section cases); the same
  payload is rejected by the mock with 400 on **POST and on PATCH** (mock spec);
  `delivered` off with an empty `shippedAt` is valid (section).
- (b) selecting two rows reveals the bar reading "2 selected", clicking **Mark
  delivered** PATCHes both, shows **one** toast reading `2 shipments updated`,
  and both rows render **Delivered** (section); a shipment with no `shippedAt`
  is accepted by the bulk PATCH because the action supplies today's date (mock
  spec asserts the PATCH body shape is legal; section asserts the row flips);
  selecting a row then paginating away leaves the bar hidden and mutates nothing
  (section); e2e captures `page.url()` before the bulk click and asserts it is
  byte-identical after (hazard 3).
- embedded: submitting the empty form shows a message under **each** nested
  destination field (street, city, country) inside a fieldset with the
  accessible name "Destination" (section); the mock rejects a nested violation
  with 400 (mock spec); `q` matches on `destination.city` (mock spec + section).

**Ticket (T2)** — plus one test per quirk:

- (a) the list renders the **label** (`High`) and never the raw number for every
  priority, and the High badge carries the destructive tone (section asserts the
  label + that the raw `3` is absent from the cell).
- (b) `?from=2024-03-01&to=2024-04-30` returns only the rows inside the window,
  endpoint-applied so `total` reflects the filtered set; each bound also works
  alone (mock spec); typing a date into **Opened from** writes `?from=…`, resets
  `page` to 1 and keeps `q` and `to` (section); e2e drives both inputs.
- (c) choosing **Close** on an open ticket PATCHes it, toasts, and the row
  flips to **Closed** while the list stays on the same page and keeps its search
  text; the item then reads **Reopen** (section); a failing PATCH raises an error
  toast (section, via a one-off MSW error override).
- enum form field: the Priority Select is drivable and its chosen value
  round-trips through create as a **number** (section); no
  uncontrolled→controlled warning is emitted.

**Event (T3)** — plus one test per heavy-workflow clause:

- (a) neither the create nor the edit form renders any `published` control
  (section asserts the absence by accessible name); a created event is
  `published: false` regardless of what the body carries (mock spec posts
  `published: true` and asserts the stored record is `false`).
- (b) publishing a draft whose `startsAt` is past → mock **422** with the date
  reason; publishing a draft with `seats: 0` → **422** with the seats reason;
  publishing a valid draft → 200 and `published: true`; unpublishing is always
  allowed (mock spec, four cases). In the UI, clicking **Publish** on a rejected
  draft surfaces the reason in the **persistent inline alert** and does not flip
  the badge (section, asserted with `findBy*` per hazard 2); clicking it on a
  valid draft flips the badge to **Published** and the button to **Unpublish**
  (section).
- (c) `?status=published` returns only the 9 published rows and `?status=draft`
  only the 15 drafts, endpoint-applied so `total` reflects the filtered set
  (mock spec); choosing **Draft** in the toolbar writes `?status=draft`, resets
  `page` to 1 and keeps `q` (section); every row carries a status badge
  (section); e2e drives the Select click-through and the publish rejection.

**Schematics** — `pnpm test:schematics` green and unchanged (36 tests / 10
files); no schematic file is edited this batch, so any movement here is a
regression to investigate, not an expected delta.

**Batch gates** — run by me, in the foreground, until all green:

```bash
pnpm typecheck && pnpm lint && pnpm test:run && pnpm test:e2e
```

Expected end state: 13 sidebar entries + 13 overview cards, `MockRouteKey` at
**65** literals, 13 mock domains all reset in the shared `afterEach`, 13 e2e
specs, **10** schematics still registered and unmodified, one added helper in
`mocks/core/errors.ts` (the batch's only shared-file edit), one new
application-layer sibling hook
(`src/features/shipments/application/use-bulk-deliver-shipments.ts`), and the
ten earlier modules otherwise untouched and still green.

---

## 6. Outcome (batch closed)

All four gates green **in one chain, run in the foreground by me** (`pnpm
typecheck && pnpm lint && pnpm test:run && pnpm test:e2e`, exit 0):

| Gate | Result | Baseline |
|---|---|---|
| `pnpm typecheck` | ✅ exit 0 | exit 0 |
| `pnpm lint` | ✅ exit 0 | exit 0 |
| `pnpm test:run` | ✅ 41 files / 335 tests | 32 / 242 |
| `pnpm test:e2e` | ✅ 102 passed | 75 |
| `pnpm test:schematics` | ✅ 36 tests / 10 files | 36 / 10 (unchanged, as predicted) |

End state matches §5's expectation exactly: **65** `MockRouteKey` literals, 13
sidebar entries (+ Overview) and 13 overview cards, 13 mock domains all reset in
the shared `afterEach`, 13 e2e specs, **10 schematics registered and
unmodified**, one added helper in `mocks/core/errors.ts`, one new
application-layer sibling hook, and the ten earlier modules untouched and still
green.

Build sequence as planned: X1 → X2 → X3 (`crud-module` run standalone, one per
shell call, for `shipments`, `tickets`, `events`) → M1/M2/M3 in parallel →
VERIFY. **No schematic was created, extended or patched** — §3's central
prediction held.

### Deviations from the plan, and fixes applied during VERIFY

- **CLI transport limit on `extraSearch` (not a schematic shortfall).** `builder
  execute` rejects any flag value containing a newline
  (`invalid_input … forbidden control character`), while `crud-routes/helper.ts:11-15`
  splits `extraSearch` **on** newlines. Ticket's two entries therefore had to be
  passed on one line, and I reformatted that single generated line into two
  afterwards. Recorded here rather than done silently (directive rule 3): the
  generated **semantics** are exactly what a multi-line input would have
  produced, and the schematic itself needs no change. If a future entity needs
  three or more extra search entries, the fix belongs in the CLI/schema, not in
  the route file.
- **Icon collision, my input error.** I specified `Truck` for Shipments, which
  Suppliers already uses. Corrected by hand to `Package` in the sidebar NAV line,
  the overview card and both import lists — a wrong input value, not a generator
  fault.
- **Four e2e failures, all test-side, fixed by me in place; no source changed:**
  1. `e2e/events.spec.ts` clicked `wine-tasting` on `/events` page 1, but it
     sorts 23rd of 24 → page 3. Narrowed with the search box first. This is
     batch 3's Vehicle lesson (`plans/batch-3.md:777-779`) recurring — **worth
     promoting to a standing hazard: never assert a fixture row onto page 1
     without searching or checking its sort position.**
  2. `e2e/events.spec.ts` publish-guard case hit a strict-mode violation because
     the reason appears in **both** the inline alert and the toast — which is
     exactly what §1.3b specified. Retargeted at `getByRole('alert')`, i.e. the
     channel the spec's "UI shows the reason" actually means.
  3. `e2e/shipments.spec.ts` asserted `toHaveText('2 selected')` on the bulk bar,
     which also contains the button (`"2 selectedMark delivered"`). Switched to
     `toContainText`.
  4. `e2e/tickets.spec.ts` asserted `getByText(subject)` after an edit, colliding
     with the success toast that quotes the subject. Added `{ exact: true }`.

  Hazard 1 (`{ exact: true }`) was pre-authorised and still under-applied in
  three specs; the mechanics applied it to labels but not to **toast-vs-content
  text collisions**. Next plan should state the hazard in that form.
- **A real correctness bug the plan did not anticipate, found and fixed by the
  Ticket mechanic.** `TicketOpenToggleItem` first mirrored
  `invoice-paid-switch.tsx`'s `mutate(vars, { onSuccess, onError })`. Selecting a
  Radix `DropdownMenuItem` unmounts the whole `DropdownMenuContent` — and so the
  component — immediately, and TanStack Query only invokes **call-level**
  callbacks while the mutation observer still has listeners. Both toasts were
  therefore silently dropped (the PATCH itself still applied, because the
  hook-level `onSuccess` invalidation is not gated the same way). Fixed with
  `mutateAsync(...).then(...).catch(...)`, whose promise is independent of mount
  state. This is a production bug, not a test artefact — any real latency
  reproduces it. **Declared rule for batch 5**: an instant PATCH fired from a
  control that unmounts on activation (row-menu item, dialog item) must use
  `mutateAsync`; `mutate` + callbacks is safe only for controls that stay mounted
  (Invoice's switch, Event's detail button).
- **Mechanic-level choices inside the specified design, accepted on review**:
  Shipment's row-menu `aria-label` follows the string-key convention (`Actions
  for ${trackingCode}`) rather than the numeric-key one; the bulk toast fires
  from `onSuccess` (with `Promise.allSettled` inside `mutationFn`, the mutation
  never rejects, so `onSuccess` *is* the settle point); Ticket's "raw number
  absent" assertion is scoped to the Priority cell (ticket 3's number also
  renders in its own row); `getByRole(..., { exact: true })` was dropped where
  Testing Library's `ByRoleOptions` has no such field (role-name matching is
  already exact).
- Fixtures exceed their floors: Shipment has 8 undelivered-unshipped rows (6
  required) and Ticket's window split is 6 before / 12 inside / 6 after, with two
  rows sitting exactly on the bounds so inclusivity is actually exercised.

### Carried forward to the next plan (batch 5 — Subscription [T3], Employee [T3])

- **No schematic work is expected.** With two entities left, nothing can reach
  the directive's "3+ repeats ahead". Run `default:crud-module` twice and hand-
  build the rest; §3's table already records why each candidate closed.
- **The two-schema domain split is the declared rule for Subscription's
  non-editable `plan`**: `eventUpsertSchema` (wire, field optional) +
  `eventFormSchema` (`.omit()`, field structurally absent) — see
  `src/features/events/domain/event.ts:40-61`. Enforce "cannot change plan" with
  the type system, not with a disabled input alone.
- **Instant row PATCH from a row-menu item must use `mutateAsync`** (above).
  Subscription's "Renew" is exactly this control; mirror
  `ticket-open-toggle-item.tsx`, not `invoice-paid-switch.tsx`.
- **Employee's role switch** is the first Zustand store outside
  `shared/stores/mock.store.ts` — that file is the shape to mirror. Note the
  spec's "other modules are NOT affected", i.e. the guard belongs in the
  employees feature, not in the shell or the router's global config.
- **The wizard (Subscription) has no precedent**: step state is explicitly *not*
  in the URL, so it is local component state, and the tree has no multi-step form
  to copy. Budget planning time for it; `tabs.tsx` exists but is unwired and is
  not a wizard.
- **Standing e2e hazards**, now four: strict-mode label collisions **and
  toast-vs-content text collisions**; never assert a bare path with `toHaveURL`
  against a list route; `findBy*` after any mutation; and never assume a fixture
  row is on page 1.
- `mocks/core/errors.ts` now exposes 404/400/409/422/500 — the 422 helper is
  available if batch 5 needs a workflow guard.
