# Batch 5 — Subscription [T3], Employee [T3]

Orchestrator plan per `HARNESS.md`. Authority on architecture/patterns is `AGENTS.md`; design
language is `DESIGN.md`. Reference module: **Author** (`src/features/authors/**`). Closest
precedents for this batch: **Payment** (batch 3 — numeric key + string enum + date + boolean,
RHF-bound `Select`), **Author**/**Supplier** (numeric key + unique email, true/false-defaulting
booleans), **Ticket** (batch 4 — row-menu PATCH-and-invalidate), **Event** (batch 4 — a stored
field the forms never expose, detail-page workflow actions).

This is the FINAL batch: entities 14 and 15 of 15.

Baseline confirmed green before any change (orchestrator, foreground):
`pnpm typecheck` · `pnpm lint` · `pnpm test:run` (40 files / 348 tests).

`plan-directives/` does not exist — no external directives to incorporate.

---

## 1. Modules

### 1.1 Subscription — Tier T3 (create wizard)

Fields (`entities-benchmark.txt:191-206`): `subscriptionId: number, required, unique` ·
`plan: enum(basic | pro | enterprise), required` · `startedAt: date, required` ·
`renewals: number, required, default 0, min 0` · `active: boolean, required, default true`.
HEAVY: (a) create is a 3-step wizard — plan cards → details → read-only summary + Confirm,
Back/Next preserve values, step state NOT in the URL; (b) each step validates before Next,
Confirm submits the whole payload once; (c) row-menu "Renew" increments `renewals` via PATCH
(toast shows the new count); the edit page is a plain form and cannot change `plan`.

| File | Mirrors |
|---|---|
| `mocks/core/types.ts` (+5 keys `LIST_SUBSCRIPTIONS`…`DELETE_SUBSCRIPTION`) | append after `'DELETE_EVENT'` (`:79`) |
| `mocks/fixtures/subscriptions.fixture.ts` (24 rows) | `payments.fixture.ts` |
| `mocks/domains/subscriptions.mock.ts` (+ `resetSubscriptions`) | `payments.mock.ts` (numeric key + string enum) |
| `mocks/domains/subscriptions.mock.spec.ts` | `payments.mock.spec.ts` |
| `mocks/handlers.ts` (`:5-17` imports, `:37-51` array) · `mocks/setup-test-mocking.ts` (`:4-16`, `:45-60`) | existing |
| `src/features/subscriptions/domain/subscription.ts` | `domain/payment.ts` (enum + labels table) |
| `src/features/subscriptions/infrastructure/subscriptions.api.ts` | `events.api.ts` (a dedicated workflow method beside `update`) |
| `src/features/subscriptions/application/use-subscriptions.ts` | `use-tickets.ts` (incl. `useSetTicketOpen` → `useRenewSubscription`) |
| `…/presentation/subscriptions-page.tsx` | `tickets-page.tsx` (row-menu mutation) |
| `…/presentation/subscription-create-page.tsx` (**the wizard**) | NEW — §3.2/§3.3 |
| `…/presentation/plan-picker.tsx` | NEW — §3.3 |
| `…/presentation/subscription-form.tsx` (edit-only plain form) | `payment-form.tsx` |
| `…/presentation/subscription-edit-page.tsx` · `…-detail-page.tsx` | Payment equivalents |
| `…/presentation/subscription-status-badge.tsx` | `authors/presentation/active-badge.tsx` |
| `…/presentation/subscriptions-page.test.tsx` · `subscription-create-page.test.tsx` · `subscription-form.test.tsx` | Ticket + Event (3 files, like Event) |
| `src/routes/subscriptions/{index,new}.tsx`, `src/routes/subscriptions/$subscriptionId/{index,edit}.tsx` | `src/routes/payments/**` (numeric param → `Number(...)` cast) |
| `src/app/shell/app-sidebar.tsx` (one NAV line) · `src/routes/index.tsx` (one card) | existing |
| `e2e/subscriptions.spec.ts` | `e2e/tickets.spec.ts` |

### 1.2 Employee — Tier T3 (role-based read-only)

Fields (`entities-benchmark.txt:208-222`): `employeeId: number, required, unique` ·
`fullName: string, required` · `email: string, required, unique` · `hiredAt: date, required` ·
`remote: boolean, required, default false`.
HEAVY: (a) a global Admin | Viewer switch in the sidebar footer, Zustand, default Admin, no
persistence; (b) as Viewer the Employees module hides New/Edit/Delete and every row mutation,
list and detail stay readable, and direct navigation to `/employees/new` or
`/employees/$employeeId/edit` redirects to the list; (c) other modules are unaffected.

Same file list with `employees`/`employee`, key param `$employeeId` (numeric → `Number(...)`),
`remote-badge.tsx` instead of the status badge, no wizard (`employee-form.tsx` serves create
and edit, the standard optional-entity signature), **plus** these global files:

- `src/shared/stores/role.store.ts` — the role store (orchestrator-owned, wave 0, §3.7)
- `src/app/shell/role-switch.tsx` — the sidebar-footer control (orchestrator-owned, §3.8)
- `src/app/shell/app-sidebar.tsx` — footer gains `<RoleSwitch />` beside `<MockIndicator />`
- `src/test/setup.ts` — global `afterEach` resetting the role store (§3.9)
- section tests: `employees-page.test.tsx`, `employee-form.test.tsx` and a **third** file
  `employee-role-access.test.tsx` for the whole role behaviour (Event's three-file precedent)

---

## 2. Pattern inventory (scout report, incorporated)

The `scout` sub-agent ran read-only over `AGENTS.md`, `DESIGN.md`, `entities-benchmark.txt`, all
four prior plans, every feature module, every mock domain, `src/shared/**`,
`src/components/ui/**`, `src/routes/**`, `src/app/shell/**`, `src/test/**`, `e2e/**` and the
configs. Its findings, with the evidence it cited:

### Predictions previous plans made about batch 5 (verbatim, all honoured below)

- `plans/batch-3.md:166` — "form `Select` → Ticket `priority` (1; **Subscription's `plan` is
  spec'd as *cards*, not a Select**)."
- `plans/batch-3.md:499-500` — "the row-level PATCH-and-invalidate action (Ticket's Close/Reopen
  and Subscription's Renew reuse the plumbing through a row *menu* rather than a switch)."
- `plans/batch-4.md:160-161` — "**Repeats in Batch 5: 1** — Subscription's 'Renew' is the same
  shape (increment instead of toggle), so the mechanic must keep the hook shape clean and
  copyable."
- `plans/batch-4.md:120-121` — "**Repeats in the remaining schedule (Batch 5): 0.** Neither
  Subscription nor Employee has a bulk shape." → the batch-4 bulk machinery stays untouched.
- `plans/batch-2.md:177` — "Two-unique-field 409 pairing | Employee (batch 5) | 1."
- `plans/batch-3.md:104` — false-defaulting boolean → "… **Employee `remote`**".
- `plans/batch-4.md:654-658` — "Shapes established here for batch 5: the row-menu
  PATCH-and-invalidate action …, the upsert schema that omits a stored field and the detail-page
  workflow action pair (**the nearest precedents for Subscription's plan-locked edit**) …".

No prior plan predicted the wizard or the role gate — both are new territory.

### Subscription — every field shape EXISTS; the wizard and the plan cards are NEW

- **Numeric unique key** (`subscriptionId`): 6th occurrence — `authorId`
  (`src/features/authors/domain/author.ts:12`), `reviewId`, `invoiceNumber`, `paymentId`,
  `ticketNumber`. Route param casts with `Number(...)`
  (`src/routes/payments/$paymentId/edit.tsx:10`).
- **String-valued enum** (`plan`) = Payment's `method` verbatim
  (`src/features/payments/domain/payment.ts:25`) with the `PAYMENT_METHOD_LABELS` label-table
  idiom (`payment.ts:55-59`, "raw enum values never reach the UI"). NOT Ticket's numeric
  `z.literal([1,2,3])`.
- **`active` defaults TRUE** — the Author idiom (`author-form.tsx:107` `checked={field.value ?? true}`,
  `authors.mock.ts` `body.active ?? true`), the OPPOSITE of Employee's `remote`. The two modules
  in this batch differ here and the mechanics must not cross-copy (the same warning
  `plans/batch-3.md:97-98` gave for Vehicle vs Author).
- **`renewals: number, default 0, min 0` is a NEW combination**: `grep` over
  `mocks/domains/*.mock.ts` shows 13 create-time defaults, **all boolean** (`?? true` / `?? false`);
  no `?? 0` exists. The pieces are precedented separately — non-negative integer = Warehouse
  `capacity` / Event `seats`; "apply the default when the field is absent from the POST body" =
  the same `body.<field> ?? <default>` line. A stored field the forms never render is Event's
  `published` (`event.ts:39`, `eventSchema.omit({ published: true })`).
- **MULTI-STEP WIZARD — no precedent at all.** `grep -rn "trigger(" src/features` → **0 hits**
  (no form has ever used RHF's `trigger`). `grep -rln "step\|wizard"` over `src/features`
  `src/routes` → only the HTML `step="0.01"` attribute (`payment-form.tsx:81`,
  `shipment-form.tsx:75`, `invoice-form.tsx:144`). Every `<singular>-create-page.tsx` in the tree
  is a thin wrapper around one `<XForm>` with one submit
  (`payments/presentation/payment-create-page.tsx:1-41`); every `<singular>-form.tsx` serves
  create and edit off an optional entity prop, with the key field
  `disabled={entity !== undefined}` (`author-form.tsx:12-16,35,46`).
- **shadcn primitives**: `card.tsx`, `tabs.tsx`, `checkbox.tsx`, `select.tsx`, `switch.tsx`,
  `field.tsx`, `dialog.tsx`, `dropdown-menu.tsx`, `alert-dialog.tsx`, `command.tsx`,
  `popover.tsx`, `pagination.tsx` (unused), `badge.tsx`, `skeleton.tsx`, `table.tsx`, … are
  present. **ABSENT: no `radio-group`, no stepper, no progress primitive.** "Plan selection as
  cards" must be hand-rolled; every prior "choose one of N" control was a `Select`.
- **Step state out of the URL** inverts the tree's habit (`AGENTS.md:64`: list state lives in the
  URL) — but that rule is about *list* state, so there is no conflict; the wizard is the first
  create page needing component state beyond form state.
- **Row action "Renew"**: `src/features/tickets/application/use-tickets.ts:67-74`
  (`useSetTicketOpen`) is the confirmed template, wired from a third `DropdownMenuItem` above
  Delete (`tickets-page.tsx:232-234`). Two deltas: the body is an **increment computed from the
  row's current value** (no atomic `$inc` exists — every mock `PATCH` is a plain merge), and the
  toast must read the **server response** (`onSuccess: (updated) => …`), a shape already proven
  by `payment-create-page.tsx:31-34`.

### Employee — the CRUD shape EXISTS verbatim; the role gate is NEW end to end

- **Numeric key + unique email** = Supplier/Author's exact shape; the two-unique-field 409
  pairing with an `exceptId` exclusion on PATCH is `authors.mock.ts:56-60,102-103,127`, proven by
  `authors.mock.spec.ts:76-88`.
- **`remote` defaults FALSE** — the Review `verified` / Payment `confirmed` / Shipment
  `delivered` idiom (4th occurrence).
- **Zustand**: exactly ONE store exists, `src/shared/stores/mock.store.ts` (`useMockStore`,
  flat state + one action, no `persist` middleware), consumed as a plain hook call in
  `src/app/shell/mock-indicator.tsx:11`. A second store is a new file, not an extension.
- **No precedent for resetting a Zustand store between tests**: `grep -rn "setState|getState"
  --include='*.test.tsx' src` → **0 hits**; `src/test/setup.ts` stubs only browser APIs;
  `mocks/setup-test-mocking.ts`'s `afterEach` resets the 13 mock-domain stores and nothing else.
  Zustand state is module-scoped and survives across tests in the same file → a reset is
  mandatory and has to be designed, not copied (§3.9).
- **Sidebar footer** today holds exactly `<MockIndicator />` inside `<div className="border-t p-3">`
  (`app-sidebar.tsx:69-71`). `MockIndicator` is a single `<button type="button" aria-pressed=…>`
  with a dot + label — the `aria-pressed` toggle idiom, and `plans/batch-2.md:292` already
  sanctioned "a segmented `Button` group with `aria-pressed`" as the two-option control shape.
- **Route guards do not exist**: `grep -rn "beforeLoad|redirect(" src/routes src/main.tsx` →
  **0 hits**. Every route file is "search schema (list only) + component". Critically, TanStack
  Router re-runs `beforeLoad` only on navigation/invalidation — it does not subscribe to a
  Zustand store, so a `beforeLoad` guard would not react to a role flip while the route is
  already mounted. §3.10 resolves this.
- **E2E**: `grep -n "test.beforeEach" e2e/*.spec.ts` → 0 hits; every test is a flat
  `page.goto(...)` and `playwright.config.ts:4-6` gives each test a fresh context, so an
  in-memory store cannot leak between e2e tests. No spec has ever driven a global control.
- **Other modules unaffected** (heavy c) is free: `src/routes/__root.tsx` is a thin layout and no
  shared wrapper reads the role.

### Mechanical facts (from scout; binding for all delegations)

- `mocks/core/types.ts:14-79` — `MockRouteKey`, last entry `'DELETE_EVENT'`; append 5 keys per
  entity after it.
- `mocks/handlers.ts:5-17` imports (alphabetical) · `:37-51` array (insertion-ordered by batch,
  last `...eventHandlers(config, base),` at `:50`).
- `mocks/setup-test-mocking.ts:4-16` imports (alphabetical) · `:45-60` `afterEach`
  (last `resetEvents()` at `:59`).
- `src/app/shell/app-sidebar.tsx:2-17` icon imports · `:28-43` `NAV`
  (last `{ to: '/events', label: 'Events', icon: CalendarDays }`).
- `src/routes/index.tsx:2-17` icon imports · card grid (last card Events).
- Icons already taken: `LayoutDashboard, Users, BookOpen, Tags, Star, Truck, BadgePercent,
  Warehouse, Car, FileText, CreditCard, Package, Ticket, CalendarDays`.
- `PAGE_SIZE = 10` per list page; **24 fixture rows** per domain → "Page 1 of 3".
- `src/routeTree.gen.ts` is generated by the `tanstackRouter` vite plugin and imported by
  `src/test/render-app.tsx` — **run `pnpm typecheck` before `pnpm test:run` whenever routes
  change** (`pnpm typecheck` runs `vite build` first, which regenerates the route tree).
- `renderApp(path)` returns `{ ...result, router }`; section tests assert on
  `router.state.location.{pathname,search}`.
- `.oxlintrc.json` disables `react/only-export-components` only for `src/routes/**` and
  `src/components/ui/**` — one component per file everywhere else.
- Cross-feature import rule (batch 1, still binding): a feature may import another feature's
  `domain`/`infrastructure`/`application`, **never** its `presentation`. Both new badge
  components are therefore entity-local copies, not imports of `authors/presentation`.

### Traps carried forward (binding)

1. **Playwright's `getByText` is substring-based** (RTL's is not). "Active" is a substring of
   "Inactive" → every Playwright assertion on the subscription status badge uses
   `{ exact: true }`. This is batch 4's "a status word that is a substring of its own toggle"
   trap (`plans/batch-4.md:637-642`) in a new guise.
2. **"Admin" is already in the DOM**: `app-sidebar.tsx:52` renders the app title
   `<span>Admin</span>`. The role switch adds a *button* named "Admin" — so tests must query
   `getByRole('button', { name: 'Admin', exact: true })`, never `getByText('Admin')`.
3. **`page.goto()` resets the role store.** It is in-memory with no persistence (the spec
   requires that), so a full page load returns to Admin. E2E therefore proves the redirect by
   flipping the role *while mounted*; the true direct-navigation case is proven in the section
   test, where the store can be set before `renderApp` (§3.10, §5).
4. **RHF keeps values of unmounted fields** because `shouldUnregister` defaults to `false` —
   that is what makes wizard Back/Next preserve entries. Do not set `shouldUnregister: true`.
   Fallback if a re-mounted `register`ed input loses its DOM value: keep all steps mounted and
   toggle the inactive ones with the `hidden` attribute (§3.2).
5. **Radix `Select` starts uncontrolled on `undefined`** — bind `value={field.value ?? ''}`
   (`payment-form.tsx:98-102`). Applies to the edit form's disabled `plan` Select.
6. **List sort order vs the page-1 window** — tests may only target fixture rows inside the
   first 10 sorted rows, or must page/search first. Pinned windows are fixed in §3.13.
7. **Serialised delegation**: both modules edit the same five shared files, so mechanic waves run
   one at a time, each a blocking foreground call.

---

## 3. Orchestrator design decisions (mechanics implement, never decide)

**3.0 Domain shape — Subscription.** `renewals` stays in the entity schema and is *optional* in
the upsert schema (the spec's "default X fields are optional on create"), but **no form ever
renders it**: it is workflow-owned, moved only by Renew. That is Event's `published` discipline
expressed with the tree's existing optional-default idiom rather than `.omit()`, because unlike
`published` the spec explicitly allows `renewals` on create.

```ts
export const subscriptionSchema = z.object({
  subscriptionId: z.number('Subscription ID is required').int(),
  plan: z.enum(['basic', 'pro', 'enterprise'], 'Plan is required'),
  startedAt: z.iso.date('Must be a valid date'),
  renewals: z.number().int().min(0, 'Renewals cannot be negative'),
  active: z.boolean(),
})
export type Subscription = z.infer<typeof subscriptionSchema>

/** `renewals`/`active` are optional on create (server defaults 0 / true). */
export const subscriptionUpsertSchema = subscriptionSchema.extend({
  renewals: z.number().int().min(0, 'Renewals cannot be negative').optional(),
  active: z.boolean().optional(),
})
export type SubscriptionUpsert = z.infer<typeof subscriptionUpsertSchema>

export type SubscriptionPlan = Subscription['plan']
/** Single source of truth for how each plan renders — raw enum values never reach the UI. */
export const SUBSCRIPTION_PLAN_LABELS: Record<SubscriptionPlan, string> = {
  basic: 'Basic', pro: 'Pro', enterprise: 'Enterprise',
}
/** Ordered for the wizard's cards and the edit form's Select. */
export const SUBSCRIPTION_PLANS: SubscriptionPlan[] = ['basic', 'pro', 'enterprise']
/** Card copy for the wizard's plan step (heavy a). */
export const SUBSCRIPTION_PLAN_DESCRIPTIONS: Record<SubscriptionPlan, string> = {
  basic: 'One workspace, community support.',
  pro: 'Five workspaces, priority support.',
  enterprise: 'Unlimited workspaces, dedicated support.',
}
export function subscriptionKey(s: Pick<Subscription, 'subscriptionId'>): number { return s.subscriptionId }
```

The schema is NOT refined, so `zodResolver` infers it and trap 3 of batch 4 does not fire.

**3.1 Where `subscriptionId` lives in the wizard.** The spec names step 2 "details (startedAt,
active)" but `subscriptionId` is required, unique, and must surface a 409 — so it is the first
field of **step 2** ("Details"), before `startedAt` and `active`. Nothing is auto-generated: the
tree's convention is user-entered keys, and the create-conflict test needs one.

**3.2 Heavy (a)+(b) — the wizard: ONE `useForm`, one `<form>`, one submit.**
`subscription-create-page.tsx` owns everything except the plan cards:

```tsx
type WizardStep = 1 | 2 | 3
const [step, setStep] = useState<WizardStep>(1)
const { register, control, handleSubmit, trigger, watch, formState: { errors } } =
  useForm<SubscriptionUpsert>({
    resolver: zodResolver(subscriptionUpsertSchema),
    defaultValues: { active: true },
  })

async function handleNext() {
  // Heavy (b): each step validates its own fields before advancing.
  const valid = await trigger(step === 1 ? ['plan'] : ['subscriptionId', 'startedAt'])
  if (valid) setStep(step === 1 ? 2 : 3)
}
```

- All three steps live inside a single `<form onSubmit={handleSubmit(onSubmit)} noValidate>`.
  Back/Next are `type="button"`; **Confirm is the only `type="submit"` in the page**, so the
  whole payload is submitted exactly once (heavy b).
- Inactive steps are conditionally rendered (not hidden). Values survive because RHF's
  `shouldUnregister` defaults to `false` (trap 4) — the `hidden`-attribute variant is the
  authorised fallback if and only if a re-mounted input is observed to lose its value.
- **Step state is component state** (`useState`), never a search param; the URL stays
  `/subscriptions/new` through all three steps (heavy a), and that is asserted in both the
  section test and the e2e.
- Step chrome: `<ol aria-label="Steps" className="mb-6 flex gap-6 text-sm">` with one `<li>` per
  step, `aria-current={step === n ? 'step' : undefined}`, text `1. Plan` / `2. Details` /
  `3. Summary`, the current one `text-foreground`, the others `text-muted-foreground`.
  Each step body opens with an `<h2 className="text-sm font-medium">` (`Choose a plan`,
  `Subscription details`, `Review and confirm`).
- Step 3 is **read-only**: a `<dl>` (the detail-page shape) fed from `watch()` — Plan (label, not
  the raw value), Subscription ID, Started at, Active (`Yes`/`No`) — plus `Back` and
  `Confirm subscription`. The 409 `serverError` renders here as `<p role="alert" className="text-sm text-destructive">`,
  and Back still works so the user can fix the ID.
- Buttons per step: 1 → `Next` + `Cancel`; 2 → `Back` + `Next` + `Cancel`; 3 → `Back` +
  `Confirm subscription` + `Cancel`. `Cancel` navigates to `/subscriptions`.
- On success: `toast.success(\`Subscription #${created.subscriptionId} created\`)` then
  `navigate({ to: '/subscriptions' })` — the tree's create behaviour.

**3.3 Heavy (a) — plan cards.** No `radio-group` primitive exists, so `plan-picker.tsx` is a
hand-rolled, accessible radio group (its own file; one component per file):

```tsx
<div role="radiogroup" aria-label="Plan" className="grid gap-3 sm:grid-cols-3">
  {SUBSCRIPTION_PLANS.map((plan) => (
    <button
      key={plan}
      type="button"
      role="radio"
      aria-checked={value === plan}
      aria-label={SUBSCRIPTION_PLAN_LABELS[plan]}
      onClick={() => onChange(plan)}
      className={cn(
        'rounded-lg border p-4 text-left transition-colors hover:bg-accent focus-visible:ring-2 focus-visible:ring-ring outline-none',
        value === plan && 'border-primary bg-accent',
      )}
    >
      <span className="block text-sm font-medium">{SUBSCRIPTION_PLAN_LABELS[plan]}</span>
      <span className="mt-1 block text-xs text-muted-foreground">
        {SUBSCRIPTION_PLAN_DESCRIPTIONS[plan]}
      </span>
    </button>
  ))}
</div>
```

Bound through a `Controller` on `plan` (`value={field.value}`, `onChange={field.onChange}`), the
same edge-adaptation shape `payment-form.tsx:92-121` uses for `Select`. The explicit `aria-label`
makes each option's accessible name exactly `Basic`/`Pro`/`Enterprise` (the visible title is the
same string, so axe's label-content-name-mismatch rule is satisfied) and keeps
`getByRole('radio', { name: 'Pro' })` unambiguous against the description text.
`errors.plan` renders under the group as the usual `<p role="alert" className="text-xs text-destructive">`.

**3.4 Heavy (c) — the edit form is plain and plan-locked.** `subscription-form.tsx` takes a
**required** `subscription: Subscription` prop and is used only by `subscription-edit-page.tsx`
— create goes through the wizard, so there is no create branch to keep alive and no dead code.
`subscriptionId` renders as a disabled `Input` (the tree's key-field idiom) and `plan` as a
`Controller`-bound `Select` with `disabled` on the root (`value={field.value ?? ''}`, trap 5), so
it is reachable and assertable as `getByRole('combobox', { name: 'Plan' })` and cannot be
changed. `startedAt` (date input) and `active` (`Switch`, `checked={field.value ?? true}`) are
editable. `renewals` is not rendered at all. Header comment states the two reasons (heavy a and
heavy c) so the deviation from the tree's shared-form signature is self-documenting.

**3.5 Heavy (c) — Renew.** Infrastructure gets a dedicated workflow method beside `update`, the
`eventsApi.setPublished` precedent, so presentation never hand-builds the payload:

```ts
renew: (subscriptionId: number, renewals: number) =>
  api<Subscription>(`/subscriptions/${subscriptionId}`, {
    method: 'PATCH', body: JSON.stringify({ renewals }),
  }),
```

Application hook mirrors `useSetTicketOpen` exactly (invalidate, never optimistic — `page`/`q`
live in the URL, so the refetch cannot disturb the row's list state):

```ts
export function useRenewSubscription() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ subscriptionId, renewals }: { subscriptionId: number; renewals: number }) =>
      subscriptionsApi.renew(subscriptionId, renewals),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: subscriptionKeys.all }),
  })
}
```

Row wiring: a third `DropdownMenuItem` labelled `Renew`, above Delete, sending
`renewals: subscription.renewals + 1` (there is no atomic increment in the wire contract) and
toasting the **server's** new count:

```tsx
onSuccess: (updated) =>
  toast.success(
    `Subscription #${updated.subscriptionId} renewed — ${updated.renewals} renewal${updated.renewals === 1 ? '' : 's'}`,
  ),
onError: (error) => toast.error(error.message),
```

**3.6 Subscription mock rules.** `payments.mock.ts` verbatim minus the cross-field rule, plus:
`POST` applies `renewals: body.renewals ?? 0` and `active: body.active ?? true`; `validateUpsert`
rejects a non-integer/negative `renewals`, a `plan` outside the enum, a bad `startedAt`
(`YYYY-MM-DD`), and a non-integer `subscriptionId`; 409 on a duplicate `subscriptionId`; `PATCH`
merges then re-validates, so `{ renewals: -1 }` is a 400. `q` searches `String(subscriptionId)`
and `plan`. Sorted by `subscriptionId` ascending. No list filter (none is specified).

**3.7 Heavy (a) — the role store** (orchestrator-owned, wave 0). A new sibling of
`mock.store.ts`, same flat shape, **no persistence** (the spec says so, and it is what makes each
e2e test start as Admin):

```ts
import { create } from 'zustand'

export type Role = 'admin' | 'viewer'

type RoleStore = {
  /** Who the app thinks you are. Default Admin; never persisted. */
  role: Role
  setRole: (role: Role) => void
}

/**
 * Global role switch (Employee heavy a). Deliberately NOT persisted:
 * a reload returns to Admin, which also keeps every e2e test isolated.
 * Only the Employees module reads it (heavy c).
 */
export const useRoleStore = create<RoleStore>((set) => ({
  role: 'admin',
  setRole: (role) => set({ role }),
}))
```

**3.8 Heavy (a) — the sidebar-footer control** (orchestrator-owned). `role-switch.tsx`, a
segmented pair of `aria-pressed` buttons — the `MockIndicator` idiom and the shape
`plans/batch-2.md:292` sanctioned, chosen over a `Select` because both states must stay visible
and jsdom-drivable:

```tsx
<div role="group" aria-label="Role" className="mb-2 flex gap-1 rounded-md border p-0.5">
  {(['admin', 'viewer'] as const).map((value) => (
    <button
      key={value}
      type="button"
      aria-pressed={role === value}
      onClick={() => setRole(value)}
      className={cn(
        'flex-1 rounded-sm px-2 py-1 text-xs transition-colors',
        role === value ? 'bg-accent text-foreground' : 'text-muted-foreground hover:text-foreground',
      )}
    >
      {ROLE_LABELS[value]}
    </button>
  ))}
</div>
```

with `ROLE_LABELS = { admin: 'Admin', viewer: 'Viewer' }` local to the file. It goes **above**
`<MockIndicator />` inside the existing `<div className="border-t p-3">`. Accessible names are
exactly `Admin` and `Viewer` — trap 2 requires tests to reach them by role, not by text.

**3.9 Resetting the role store between tests** (orchestrator-owned). Module-level Zustand state
survives across tests in a file and no reset idiom exists, so one global `afterEach` is added to
`src/test/setup.ts`, right where the browser-API stubs live:

```ts
import { afterEach } from 'vitest'
import { useRoleStore } from '@/shared/stores/role.store'

// The role store is module-level Zustand state: it outlives an individual
// test. Reset it globally so a Viewer-mode case can never leak into the
// next test (the mock-domain equivalent of mocks/setup-test-mocking.ts's
// afterEach).
afterEach(() => {
  useRoleStore.setState({ role: 'admin' })
})
```

Section tests that need Viewer set it explicitly with
`useRoleStore.setState({ role: 'viewer' })` before `renderApp(...)`.

**3.10 Heavy (b) — the guard lives in the page components, not in `beforeLoad`.** Route files
stay thin (`AGENTS.md:66`) and, decisively, TanStack Router does not re-run `beforeLoad` when an
external store changes — a role flip while `/employees/new` is mounted would not redirect. Both
`employee-create-page.tsx` and `employee-edit-page.tsx` therefore open with:

```tsx
const isViewer = useRoleStore((state) => state.role === 'viewer')
const navigate = useNavigate()
// Heavy (b): viewers cannot reach the write surfaces. This lives in the
// component rather than the route's `beforeLoad` because the router does not
// re-run `beforeLoad` when the Zustand role changes — a flip while this page
// is mounted must redirect too, not just direct navigation.
useEffect(() => {
  if (isViewer) void navigate({ to: '/employees', replace: true })
}, [isViewer, navigate])
if (isViewer) return null
```

so the form never flashes. In `employees-page.tsx` and `employee-detail-page.tsx` the same
`isViewer` flag hides — not merely disables — the write affordances:

- list: the header `New employee` button, the empty-state `New employee` button, the whole
  actions column (both its `<TableHead>` and each row's `<TableCell>`, so the table keeps a
  consistent column count);
- detail: the `Edit` and `Delete` buttons (the `AlertDialog` goes with them).

Everything else — rows, links, detail fields — renders identically for both roles.
**No other feature imports `useRoleStore`** (heavy c), and that is asserted in a test.

**3.11 Employee mock rules.** `authors.mock.ts` verbatim with renamed fields: two unique fields
(`employeeId`, `email`) each returning 409, both re-checked on `PATCH` with the self-exclusion,
`remote: body.remote ?? false`, `hiredAt` validated as `YYYY-MM-DD`, `email` validated with the
tree's existing email check. `q` searches `String(employeeId)`, `fullName` and `email`. Sorted by
`employeeId` ascending.

**3.12 List columns.**

- Subscriptions: Subscription (link, `#7001`) · Plan (LABEL) · Started (`YYYY-MM-DD`) ·
  Renewals · Status (Active/Inactive badge) · actions (Edit · Renew · Delete)
- Employees: Employee (link, `#8001`) · Name · Email · Hired (`YYYY-MM-DD`) ·
  Remote (Remote/On-site badge) · actions (Admin only — column omitted for Viewer)

**3.13 Pinned fixture contract** (tests reference these, so they are contract; the remaining rows
are the mechanic's choice — 24 rows each, all keys unique, all dates literal `YYYY-MM-DD`):

| Domain | Pinned |
|---|---|
| subscriptions | `subscriptionId` 7001…7024 → page 1 = 7001…7010. `plan` cycles `pro, basic, enterprise` from 7001 (→ exactly 8 of each). `7001` → `plan: 'pro'`, `startedAt: '2024-01-15'`, `renewals: 2`, `active: true` (the Renew row: 2 → 3). `7002` → `plan: 'basic'`, `renewals: 0`, `active: false` (the only Inactive row needed on page 1). `7003` → `plan: 'enterprise'`, `renewals: 5`, `active: true` (the delete row). Exactly **8 inactive** rows (every third from 7002). `q=7001` → 1 row; `q=enterprise` → 8 rows. |
| employees | `employeeId` 8001…8024 → page 1 = 8001…8010. `8001` → `fullName: 'Ada Lovelace'`, `email: 'ada.lovelace@example.com'`, `hiredAt: '2021-04-12'`, `remote: true`. `8002` → `fullName: 'Grace Hopper'`, `email: 'grace.hopper@example.com'`, `hiredAt: '2019-08-01'`, `remote: false`. `8003` → the delete row. "lovelace" must appear in exactly one row (`q=lovelace` → 1). Exactly **8 remote** rows (every third from 8001). Emails are all distinct and follow `first.last@example.com`. |

**3.14 Detail pages** mirror `payment-detail-page.tsx` (`Card` + `dl`): Subscription shows
Subscription ID, Plan (LABEL), Started at, Renewals, and the status badge next to the heading;
Employee shows Employee ID, Full name, Email, Hired at, and the remote badge.

**3.15 Sidebar / overview icons** (both verified present in the installed lucide-react 1.31.0):
Subscriptions `Repeat`, Employees `IdCard`. NAV lines and overview cards append after Events.

**3.16** `PAGE_SIZE = 10`, 24 fixture rows → "Page 1 of 3" for both modules. Create navigates to
the list; edit navigates to the entity's detail page. Toast copy follows the tree's numeric-key
form: `Subscription #7001 created/updated/deleted`, `Employee #8001 created/updated/deleted`,
plus Renew's `Subscription #7001 renewed — 3 renewals`.

---

## 4. Delegation plan

Both modules edit the same five shared files (`mocks/core/types.ts`, `mocks/handlers.ts`,
`mocks/setup-test-mocking.ts`, `src/app/shell/app-sidebar.tsx`, `src/routes/index.tsx`) and
self-verify with whole-project gates, so mechanic delegations are **serialised**, each a blocking
foreground call:

| Wave | Unit | Agent | Depends on |
|---|---|---|---|
| 0 | `src/shared/stores/role.store.ts`, `src/app/shell/role-switch.tsx`, sidebar footer wiring, `src/test/setup.ts` reset (§3.7–§3.9) | orchestrator | — |
| 1 | **Subscription** module: full drill + heavy a/b/c + tests + e2e | `mechanic` | — |
| 2 | **Employee** module: full drill + heavy a/b/c + tests + e2e | `mechanic` | waves 0, 1 |

Wave 0 is orchestrator-owned because it is the only cross-cutting change in the batch: the role
switch renders on **every** page, inside every existing section test and every axe scan. The
orchestrator runs `pnpm typecheck` + `pnpm lint` + `pnpm test:run` immediately after wave 0 to
prove the other 13 modules are undisturbed before any delegation starts.

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
   page 3 holds the remaining 4; `q` filters across exactly the documented fields; `GET` 200/404;
   `POST` 201 + defaults; 400 on invalid; 409 on the duplicate unique key; `PATCH` partial merge;
   `DELETE` 204 then 404; state reseeds between tests.
   - Subscription: `POST` without `renewals`/`active` → `renewals: 0`, `active: true`;
     `renewals: -1` → 400; `plan: 'gold'` → 400; `startedAt: 'nope'` → 400; duplicate 7001 → 409;
     `PATCH { renewals: 3 }` on 7001 → 200 and only `renewals` changes;
     `PATCH { renewals: -1 }` → 400; `q=enterprise` → 8.
   - Employee: `POST` without `remote` → `remote: false`; duplicate `employeeId` → 409;
     duplicate `email` → 409; `PATCH` keeping its own email → 200 (self-exclusion);
     `PATCH` taking another row's email → 409; `hiredAt: 'nope'` → 400; `q=lovelace` → 1.
2. **Section tests** (`src/features/<plural>/presentation/*.test.tsx`): list renders page 1 from
   the API, search filters, Next → "Page 2 of 3", row-menu delete with confirmation removes the
   row; form validates on empty submit without navigating, creates, surfaces the server conflict.
   - Subscription list: the Plan column shows `Pro`/`Basic`, never the raw enum value; `Renew`
     on 7001 toasts `Subscription #7001 renewed — 3 renewals` and the row's Renewals cell becomes
     `3`, with the page/search state intact.
   - Subscription wizard (`subscription-create-page.test.tsx`): Next on step 1 without a plan
     shows `Plan is required` and stays on step 1; picking `Pro` advances; step 2 with an empty
     ID/date shows both field errors and does not advance; filling them advances to the summary,
     which shows `Pro` and the entered ID; `Back` returns to step 2 **with the values still
     there**; `Confirm subscription` creates once, toasts, and lands on `/subscriptions`;
     `router.state.location.pathname` is `/subscriptions/new` **and its search is empty at every
     step** (heavy a); a duplicate ID (7001) surfaces the 409 on the summary step without
     navigating.
   - Subscription edit (`subscription-form.test.tsx`): the Plan combobox is disabled, the
     Subscription ID input is disabled, saving `startedAt`/`active` updates and navigates to the
     detail page.
   - Employee list/form: the standard five, mirroring Supplier's tests.
   - Employee role access (`employee-role-access.test.tsx`), with
     `useRoleStore.setState({ role: 'viewer' })` before each render: the list hides
     `New employee` and every row's actions trigger while still rendering rows; the detail page
     hides `Edit` and `Delete`; `renderApp('/employees/new')` and
     `renderApp('/employees/8001/edit')` end at `/employees` with no form rendered; flipping the
     role from the sidebar switch (`getByRole('button', { name: 'Viewer' })`) while the list is
     mounted makes `New employee` disappear and flipping back restores it; **and `/authors` still
     shows `New author` as a Viewer** (heavy c).
3. **E2E** (`e2e/<plural>.spec.ts`, mirroring `e2e/tickets.spec.ts`): list + pagination, search,
   create, detail + edit, delete with confirmation, duplicate-key server error, each entity's
   heavy behaviour, and an axe scan of the list and `/new` pages asserting zero serious/critical
   violations.
   - Subscriptions: the three-step wizard end to end (cards → details → summary → Confirm), the
     URL staying `/subscriptions/new` across steps, Back preserving values, and Renew from the
     row menu. Status-badge assertions use `{ exact: true }` (trap 1).
   - Employees: switch to `Viewer` via `getByRole('button', { name: 'Viewer' })`, assert
     `New employee` is gone and the row actions are gone, open a detail page and assert no
     `Edit`/`Delete`, navigate to `/authors` and assert `New author` is still there, then — while
     still Viewer — confirm the write surfaces are unreachable by flipping the role *while
     `/employees/new` is mounted* and asserting the URL becomes `/employees` (trap 3: a
     `page.goto` would reload the SPA and reset the role to Admin). The axe scan runs in both
     roles for the list page.
4. **Gates** — the orchestrator runs, in the foreground, until all four are green:
   `pnpm typecheck && pnpm lint && pnpm test:run && pnpm test:e2e`.
   Expected final counts: 15 mock specs, 33 section-test files, 15 e2e specs.

---

## 6. Execution record

Waves ran in the planned order: 0 (orchestrator: `role.store.ts`, `role-switch.tsx`, the sidebar
footer, the `src/test/setup.ts` reset) → 1 (Subscription, `mechanic`) → 2 (Employee, `mechanic`).
Each delivery was reviewed against §1–§3 before the next wave started; no plan deviations were
needed and no mechanic made a design call of its own.

**Wave 0 was verified in isolation before any delegation** — `pnpm typecheck` · `pnpm lint` ·
`pnpm test:run` re-run immediately after the sidebar gained `<RoleSwitch />`, still 40 files /
348 tests. That mattered: the switch renders inside every section test and every axe scan in the
tree, and it was the only change in the batch that could have broken the other 13 modules.

Resolutions the mechanics reported, all consistent with §3:

- **The wizard needed no fallback.** Conditional rendering of the inactive steps preserved every
  entered value across Back/Next on its own — RHF's default `shouldUnregister: false` behaves as
  §3.2 predicted, so the authorised `hidden`-attribute variant (trap 4) was never used. The
  single-`<form>` / single-`type="submit"` construction makes "Confirm submits the whole payload
  once" (heavy b) true by construction rather than by discipline.
- **The hand-rolled `role="radiogroup"` plan cards passed axe** with zero serious/critical
  violations on `/subscriptions/new`. The explicit per-card `aria-label` keeps
  `getByRole('radio', { name: 'Pro' })` unambiguous against the description text while still
  matching the visible title, so `label-content-name-mismatch` stays clean.
- **`useSetTicketOpen` transferred to Renew exactly as `plans/batch-4.md:160-161` predicted.**
  The only deltas are the ones §3.5 named: the body is an increment computed from the row's
  current value (the wire contract has no atomic `$inc`), and the toast reads the **server's**
  returned count via `onSuccess: (updated) => …`.
- **The edit-only form signature is honest.** `subscription-form.tsx` takes a required
  `subscription` prop instead of the tree's optional one, so heavy (c)'s plan lock has no dead
  create branch to maintain; the Select is `disabled` on the root with `value={field.value ?? ''}`
  (trap 5) and remains assertable as `getByRole('combobox', { name: 'Plan' })`.
- **The component-level viewer guard covers both cases.** §3.10's `useEffect` + `if (isViewer)
  return null` handles direct navigation (proven in jsdom, where the store can be set before
  `renderApp`) and a mid-session role flip (proven in Playwright, where a `page.goto` would have
  reloaded the SPA and reset the un-persisted store — trap 3). No `beforeLoad` was added; the
  route files stayed thin.
- **Heavy (c) is enforced by construction**: `grep -rn "useRoleStore" src` outside the store, the
  switch and the test setup returns only the four Employee pages. The section test additionally
  asserts `/authors` and `/subscriptions` keep their New buttons in Viewer mode.
- Mechanic-chosen details where the plan was deliberately silent: the non-pinned fixture rows,
  `RemoteBadge`'s Remote/On-site copy (mirroring `ConfirmedBadge`), the mock's per-field 400
  message wording (mirroring `payments.mock.ts`/`authors.mock.ts`), and the step-chrome `<li>`
  styling.

**Orchestrator fixes after reviewing the deliveries:**

1. `e2e/employees.spec.ts` — the mid-session-flip redirect test asserted
   `toHaveURL(/\/employees$/)`, but the list route's `validateSearch` defaults land in the URL as
   `?page=1&q=`, so the guard's redirect produced `/employees?page=1&q=` and the assertion timed
   out. Fixed to the tree's existing matcher `/\/employees(\?|$)/` (e.g. `e2e/tickets.spec.ts:43`)
   plus a heading assertion, with a comment recording why. The guard itself was correct — only
   the assertion was too strict. **New trap for any future batch**: a redirect to a route that
   has `validateSearch` defaults never lands on a bare path.

**Final gate run (orchestrator, foreground)** — all four green:

| Gate | Result |
|---|---|
| `pnpm typecheck` | pass |
| `pnpm lint` | pass (oxlint, no findings) |
| `pnpm test:run` | 48 files / 402 tests passed |
| `pnpm test:e2e` | 129 tests passed (subscriptions 10, employees 9 added to batch 4's 110) |

Delivered: 15 mock specs, 33 section-test files, 15 e2e specs — Batch 5 is done, and with it all
15 entities of the benchmark.
