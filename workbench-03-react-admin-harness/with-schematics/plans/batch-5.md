# Batch 5 — Subscription [T3], Employee [T3]

Orchestrated per `HARNESS.md`. Authority on architecture: `AGENTS.md`. Design
language: `DESIGN.md`. Plan directives incorporated:
`plan-directives/schematics.md` (decisions recorded under **Schematic
decisions**, §3).

Baseline measured by me before planning, in the foreground, all four gates in
one chain:

| Gate | Baseline |
|---|---|
| `pnpm typecheck` | ✅ exit 0 |
| `pnpm lint` | ✅ exit 0 |
| `pnpm test:run` | ✅ 41 files / 335 tests |
| `pnpm test:e2e` | ✅ 102 passed (1.3m) |

Every gate is green today, so any red during this batch is ours.

Batch 5 is the **last batch in the schedule**. After it, zero entities remain.
That arithmetic decides every schematic question in §3 — directive rule 1
requires **3 or more repeats ahead**, and after this batch nothing repeats at
all. It also means this batch carries the two mechanisms the previous four
deliberately deferred as "no precedent, one instance": the **create wizard**
and the **role-gated module**.

---

## 1. Modules

### 1.1 Subscription [T3] — `subscriptions`, key `subscriptionId: number`

| Field | Type / rules |
|---|---|
| `subscriptionId` | number, required, integer, positive, **unique** (lookup key) |
| `plan` | string enum `basic` \| `pro` \| `enterprise`, required — **not editable after create** |
| `startedAt` | date (`YYYY-MM-DD`), required |
| `renewals` | number, required, integer, **min 0**, default `0` (optional on create) |
| `active` | boolean, required, default `true` |

Files:

```
mocks/fixtures/subscriptions.fixture.ts            24 rows (3 real pages)
mocks/domains/subscriptions.mock.ts                subscriptionHandlers() + resetSubscriptions()
mocks/domains/subscriptions.mock.spec.ts
mocks/core/types.ts                                + 5 route keys              [generated edit]
mocks/handlers.ts                                  + import/spread             [generated edit]
mocks/setup-test-mocking.ts                        + resetSubscriptions()      [generated edit]
src/features/subscriptions/domain/subscription.ts  subscriptionSchema, subscriptionUpsertSchema,
                                                   subscriptionEditFormSchema, labels, key helper
src/features/subscriptions/infrastructure/subscriptions.api.ts                 [generated]
src/features/subscriptions/application/use-subscriptions.ts                    [generated]
src/features/subscriptions/presentation/subscriptions-page.tsx
src/features/subscriptions/presentation/subscription-form.tsx                  (EDIT only — §1.1c)
src/features/subscriptions/presentation/subscription-create-page.tsx           (WIZARD — replaces
                                                                                the generated file,
                                                                                §3 rule-3 decision)
src/features/subscriptions/presentation/subscription-edit-page.tsx             [generated]
src/features/subscriptions/presentation/subscription-detail-page.tsx
src/features/subscriptions/presentation/active-badge.tsx
src/features/subscriptions/presentation/subscription-renew-item.tsx            (§1.1c)
src/features/subscriptions/presentation/subscriptions-page.test.tsx
src/features/subscriptions/presentation/subscription-form.test.tsx
src/features/subscriptions/presentation/subscription-create-wizard.test.tsx
src/routes/subscriptions/index.tsx  new.tsx  $subscriptionId/index.tsx  $subscriptionId/edit.tsx  [generated]
src/app/shell/app-sidebar.tsx                      + NAV line (icon `Repeat`)  [generated edit]
src/routes/index.tsx                               + overview card             [generated edit]
e2e/subscriptions.spec.ts
```

Reference to mirror: **Payment** for the string enum + labels-in-the-domain and
the numeric key; **Event** for the two-schema domain split; **Ticket** for the
row-menu instant PATCH. The wizard alone has no reference (§2.5).

List columns: Subscription # (link to detail) · Plan (label) · Started
(`YYYY-MM-DD`) · Renewals · Status (badge) · row actions. Sort by
`subscriptionId` ascending; `q` searches `plan | startedAt` — Payment's rule for
an entity whose only string-ish fields are an enum and a date
(`payments.mock.ts:81-85`). No list filter, so the route's `validateSearch`
stays exactly `page` + `q` (`extraSearch` is empty).

Decisions (mine — the mechanic implements, never decides):

- **Enum + labels in the domain** — Payment's declared rule verbatim
  (`payment.ts:29,34,44-51`):
  ```ts
  export const subscriptionPlans = ['basic', 'pro', 'enterprise'] as const
  plan: z.enum(subscriptionPlans, PLAN_MESSAGE)   // PLAN_MESSAGE = 'Plan is required'
  export const SUBSCRIPTION_PLAN_LABELS: Record<SubscriptionPlan, string> =
    { basic: 'Basic', pro: 'Pro', enterprise: 'Enterprise' }
  ```
  The raw enum value is **never rendered** — list cell, wizard cards, summary
  step and detail page all read the label map.
- **`renewals`** uses the established single-message convention:
  `RENEWALS_MESSAGE = 'Renewals must be a whole number of 0 or more'` passed as
  the base `z.number()` error **and** to `.int()`/`.min(0)`
  (`event.ts:24,30`). Input `type="number"`, `valueAsNumber: true`.
  `subscriptionId` mirrors `payment.ts:32` exactly:
  `z.number().int().positive()`.
- **(c) "Edit cannot change plan" — the two-schema split, asymmetric variant.**
  Batch 4 declared Event's split the rule for exactly this
  (`plans/batch-4.md:856-860`, `src/features/events/domain/event.ts:55-63`).
  Event's rule is *symmetric* (`published` absent from create **and** edit);
  Subscription's is **asymmetric** — `plan` is writable exactly once, at
  creation, and structurally absent afterwards. Three schemas:
  ```ts
  export const subscriptionSchema = z.object({ subscriptionId, plan, startedAt, renewals, active })
  /** Wire payload — what subscriptionsApi/use-subscriptions.ts are generated against.
   *  `renewals` and `active` are optional (create defaults); `plan` stays REQUIRED
   *  because the create wizard supplies it. */
  export const subscriptionUpsertSchema = subscriptionSchema.extend({
    renewals: z.number(RENEWALS_MESSAGE).int(RENEWALS_MESSAGE).min(0, RENEWALS_MESSAGE).optional(),
    active: z.boolean().optional(),
  })
  /** Edit-form values — `plan` is structurally ABSENT. A form cannot express it. */
  export const subscriptionEditFormSchema = subscriptionUpsertSchema.omit({ plan: true })
  ```
  - The **create wizard** resolves against `subscriptionUpsertSchema` — its
    values type *is* the wire payload, so `useCreateSubscription().mutate(values)`
    typechecks with no cast.
  - The **edit form** resolves against `subscriptionEditFormSchema`.
    `SubscriptionEditFormValues` has no `plan` key at all, and
    `useUpdateSubscription(id)` takes `Partial<SubscriptionUpsert>`, so the
    **generated** `subscription-edit-page.tsx` compiles unchanged and cannot be
    made to send a `plan` — enforced by the type system, not by a disabled
    input (the explicit instruction carried forward from batch 4).
  - The edit form additionally renders the current plan as **read-only text**
    (a `<p className="text-sm font-medium">Plan</p>` label plus the mapped
    label as its value — *not* an `<input>`, not a `<Label htmlFor>`), purely so
    the user can see which plan they are editing. This is cosmetic; the
    guarantee lives in the schema.
  - `defaultValues={subscription}` on the edit form is safe: Zod object schemas
    strip unknown keys, so a `plan` carried in via defaults never reaches
    `onSubmit`.
- **(a)+(b) THE CREATE WIZARD** — genuinely new (§2.5); every piece below is my
  decision. It lives in **one hand-written file**,
  `subscription-create-page.tsx`, which **replaces** the file
  `crud-create-page` generates (§3, directive rule 3 — recorded, not silent).
  - **One RHF form instance for all three steps**, created once at the top of
    the page: `useForm<SubscriptionUpsert>({ resolver:
    zodResolver(subscriptionUpsertSchema), defaultValues: { active: true } })`.
    Back/Next preserve entered values **structurally**: RHF's
    `shouldUnregister` defaults to `false`, so a field that unmounts with its
    step keeps its value in form state. No mirror-state, no `useEffect`.
  - **Step state is local**: `const [step, setStep] = useState<1 | 2 | 3>(1)`.
    It is **not** in the URL — the spec says so explicitly, and the route's
    search contract stays `page`/`q`-free for `/subscriptions/new` (the
    generated `new.tsx` has no `validateSearch` at all). This is the first piece
    of page state in the tree that is deliberately *not* URL-driven; the
    justification is the spec itself.
  - **Step 1 — plan selection as cards.** A `FieldSet` + `FieldLegend` ("Plan")
    — the tree's existing grouping idiom (`invoice-form.tsx:135-136`) — wrapping
    a `grid gap-3 sm:grid-cols-3` of three `<label>` cards. Each card contains a
    **native `<input type="radio" className="sr-only">`** registered with
    `{...register('plan')}` and `value={plan}`, plus the plan label and a
    one-line blurb. Native radios, not ARIA: they are keyboard- and
    axe-correct for free, and RHF supports radio groups through plain
    `register`. Each input carries an explicit
    `aria-label={SUBSCRIPTION_PLAN_LABELS[plan]}` so its accessible name is
    exactly `Basic` / `Pro` / `Enterprise` (the blurb text would otherwise leak
    into the name and make locators brittle — standing hazard 1).
    Selected/hover styling uses `has-[:checked]:border-primary
    has-[:checked]:bg-accent` and `has-[:focus-visible]:ring-2
    has-[:focus-visible]:ring-ring` on the label — semantic tokens only, and it
    matches DESIGN.md's "selected = surface lift" rule (`DESIGN.md:429-431`)
    with `--primary` used exactly as the palette allows (focus rings and
    intentional selection, `src/index.css:19`).
  - **Step 2 — details**: `subscriptionId` (number), `startedAt`
    (`<input type="date">`), `active` (`Controller` + `Switch`, default on).
    The spec names "startedAt, active" for this step; the entity's required
    unique key has to be entered somewhere and the details step is the only
    non-plan input step, so **`subscriptionId` belongs here** — recorded as my
    decision, not an omission. `renewals` is **not** collected: it is a
    "default X" field (`entities-benchmark.txt:22-23`), optional on create, and
    the mock defaults it to `0`.
  - **Step 3 — read-only summary + Confirm**: a `<dl>` listing Plan (label),
    Subscription number, Started, Active (`Yes`/`No`), read from
    `getValues()`. No inputs. Confirm submits the whole payload **once**.
  - **(b) Each step validates before Next**: `Next` is `type="button"` and
    calls `await trigger(['plan'])` (step 1) or
    `await trigger(['subscriptionId', 'startedAt', 'active'])` (step 2),
    advancing only when it returns `true`. This is the **first use of RHF's
    `trigger` in the tree** (§2.5); errors render through the unchanged
    `<p role="alert" className="text-xs text-destructive">` idiom under each
    field.
  - **Enter must not submit from step 1 or 2.** The `<form>`'s `onSubmit` is
    `handleSubmit((values) => { if (step !== 3) return; … })` — the guard is
    inside the submit handler, so a stray Enter in a text input can never
    create the record early. `Confirm` is the only `type="submit"` button.
  - **Success/error channel**: on success `toast.success(`Subscription
    "${created.subscriptionId}" created`)` + `navigate({ to: '/subscriptions' })`
    — byte-identical to what the generated create page would have done
    (`crud-create-page/helper.ts:38-44`), so the wizard is a drop-in
    replacement from the outside. The server error (409 duplicate id) renders
    as the established inline `<p role="alert" className="text-sm
    text-destructive">` above the actions **on step 3**, fed by
    `createSubscription.error instanceof ApiError ? …message : undefined`, and
    the wizard **does not navigate** — the same contract every form in the tree
    honours.
  - **Progress affordance**: `<p className="text-sm text-muted-foreground">Step
    {step} of 3</p>` plus an `<h2>` per step (`Choose a plan` /
    `Subscription details` / `Review`). Buttons: `Back` (steps 2–3), `Next`
    (steps 1–2), `Confirm` (step 3), `Cancel` (always, navigates to the list).
- **(c) ROW ACTION "Renew"** — `subscription-renew-item.tsx`, a per-row
  component mirroring `ticket-open-toggle-item.tsx:29-46` **exactly**, including
  its `mutateAsync` rule: a Radix `DropdownMenuItem` unmounts the whole
  `DropdownMenuContent` on select, so call-level `{ onSuccess, onError }`
  callbacks are silently dropped; the promise from `mutateAsync` is not
  (`plans/batch-4.md:824-837`, declared rule for exactly this action).
  ```ts
  update.mutateAsync({ renewals: subscription.renewals + 1 })
    .then((updated) => toast.success(`Subscription ${id} renewed — ${updated.renewals} renewals`))
    .catch((error: Error) => toast.error(error.message))
  ```
  The toast shows the **new count read from the server response**, never a
  locally computed one — the spec asks for the new count and the response is the
  authority. No dialog, no navigation; page/`q` state is preserved structurally
  because the item never navigates and the generated `onSuccess` invalidates
  `subscriptionKeys.all`. Menu order: **Renew · Edit · Delete**, Delete last and
  still the only `variant="destructive"` item — Ticket's declared placement
  (`plans/batch-4.md:259-262`).
- `active-badge.tsx` mirrors `confirmed-badge.tsx`/`open-badge.tsx`:
  `Badge variant="outline"` + `size-1.5 rounded-full` dot, `bg-success` +
  **Active** / `bg-muted-foreground` + **Inactive**.
- **Fixture**: 24 rows, deterministic, ids 1–24 already ascending, fixed literal
  dates (never `todayIso()`). Exactly **8 basic / 9 pro / 7 enterprise** (a
  repeating basic/pro/enterprise cycle for 1–21, then 22=basic, 23=pro,
  24=pro), exactly **15 active / 9 inactive**, and `renewals` spread with at
  least **6 rows at 0** and at least one row ≥ 5. The mock spec and the section
  tests assert the 8/9/7 split via `?q=enterprise`.

### 1.2 Employee [T3] — `employees`, key `employeeId: number`

| Field | Type / rules |
|---|---|
| `employeeId` | number, required, integer, positive, **unique** (lookup key) |
| `fullName` | string, required |
| `email` | string, required, **unique** (409 on duplicate) |
| `hiredAt` | date (`YYYY-MM-DD`), required |
| `remote` | boolean, required, default `false` |

Files: the same set as Subscription with `employee`/`employees`, key param
`$employeeId`, **minus** the wizard/renew files, **plus**:

```
src/shared/stores/role.store.ts                    NEW — the role store (§1.2a)
src/app/shell/role-switch.tsx                      NEW — the sidebar footer control (§1.2a)
src/app/shell/app-sidebar.tsx                      + footer edit (§1.2a)      [hand edit]
src/features/employees/presentation/remote-badge.tsx
src/features/employees/presentation/employee-role-access.test.tsx
src/routes/employees/new.tsx                       guarded — replaces generated (§1.2b, §3)
src/routes/employees/$employeeId/edit.tsx          guarded — replaces generated (§1.2b, §3)
```

Reference to mirror: **Author** — Employee is field-for-field the Author
reference entity with `country?` replaced by a required `hiredAt` date and
`active` renamed `remote` (default flipped to `false`). The whole vanilla half
of this module is Author with names substituted, including the dual-uniqueness
mock (`authors.mock.ts:44-51,88-90,108-110`). Sidebar/overview icon `IdCard`
(`Users` is taken by Authors).

List columns: Employee # (link) · Name · Email · Hired (`YYYY-MM-DD`) · Location
(badge) · row actions *(Admin only)*. Sort by `employeeId` ascending; `q`
searches `fullName | email`. No list filter — `extraSearch` is empty.

Heavy-workflow decisions (mine):

- **(a) THE ROLE STORE + SWITCH.** `src/shared/stores/role.store.ts` mirrors
  `mock.store.ts`'s shape (`create<T>()` with state + one action, no
  middleware, no `persist` — the spec says no persistence):
  ```ts
  export const roles = ['admin', 'viewer'] as const
  export type Role = (typeof roles)[number]
  export const ROLE_LABELS: Record<Role, string> = { admin: 'Admin', viewer: 'Viewer' }
  export const useRoleStore = create<RoleStore>((set) => ({
    role: 'admin',
    setRole: (role) => set({ role }),
  }))
  ```
  - **Why `shared/stores/` and not the employees feature**: the *switch* is
    global chrome (the spec puts it in the sidebar footer) and the shell may not
    import from a feature's presentation layer. The *gate* stays inside the
    employees feature — which is precisely batch 4's carried-forward
    instruction (`plans/batch-4.md:864-867`): the guard belongs to the module,
    not to the shell or a global router config. The store is the only shared
    thing; **no other feature reads it** (quirk c is satisfied by construction,
    and asserted by a test).
  - **The control**: `src/app/shell/role-switch.tsx` — a shadcn `Select`
    (`size="sm"`, `aria-label="Role"`, `value={role}`, items `Admin` / `Viewer`
    labelled from `ROLE_LABELS`), mirroring the proven toolbar-filter Select
    wiring (`payments-page.tsx:116-134`). A `Select` rather than
    `MockIndicator`'s toggle button because both role names must be visible and
    selectable, and because Radix `Select` is the one control this repo has
    proven drivable in **both** jsdom (`payments-page.test.tsx:93`) and
    Playwright (`e2e/payments.spec.ts:99`).
  - **Placement**: inside the existing sidebar footer, above `MockIndicator`:
    `<div className="border-t p-3 space-y-2"><RoleSwitch /><MockIndicator /></div>`
    (`app-sidebar.tsx:54-56`). This is the batch's **only** shared-file edit
    beyond the generated registrations, and it is assigned exclusively to M2.
  - **Hazard, pre-recorded**: the sidebar header already renders the literal
    text `Admin` (`app-sidebar.tsx:37`) and the Select trigger will render it
    too. Every locator that touches the role control — in section tests and
    e2e — must go through `getByRole('combobox', { name: 'Role' })` and
    `getByRole('option', { name: 'Admin' | 'Viewer' })`. **No test may use
    `getByText('Admin')`.** All 27 existing `getByRole('combobox', …)` call
    sites in the tree are already name-scoped, so the new sidebar Select cannot
    collide with them (verified by me across `src/` and `e2e/`).
  - **The store is module-global and `renderApp` does not reset it.** Every
    employees section test file therefore starts with
    `beforeEach(() => useRoleStore.setState({ role: 'admin' }))`. No other
    test file touches the store, so the default holds everywhere else.
- **(b) VIEWER IS READ-ONLY — two layers, both required.**
  1. **UI layer** (inside the employees feature only):
     `const isAdmin = useRoleStore((state) => state.role) === 'admin'`.
     - `employees-page.tsx`: the header "New employee" button and the
       empty-state "New employee" button render only when `isAdmin`; the row
       actions column — **both the `<TableHead>` and each row's `<TableCell>`** —
       renders only when `isAdmin`, so a Viewer sees no menu trigger at all and
       the table keeps a consistent column count. The delete `AlertDialog` is
       unreachable without the menu; it stays mounted (harmless) rather than
       being conditionally rendered.
     - `employee-detail-page.tsx`: the `Edit` link and the `Delete` button
       render only when `isAdmin`. The record itself stays fully readable.
     - "any row mutations": Employee has **no** inline row PATCH (no switch, no
       toggle item), so hiding the menu is the complete surface. Recorded so the
       absence is a decision, not an oversight.
     - Hidden, not disabled: the spec says "hides/disables", and a hidden
       control is unambiguous for both axe and the tests.
  2. **Route layer**: `/employees/new` and `/employees/$employeeId/edit` guard
     with TanStack Router's `beforeLoad` + `redirect` — verified exported by
     the installed `@tanstack/react-router` 1.170.25
     (`dist/esm/index.d.ts:22`):
     ```ts
     beforeLoad: () => {
       if (useRoleStore.getState().role !== 'admin') throw redirect({ to: '/employees' })
     }
     ```
     `getState()` because `beforeLoad` is not a React render context. This is
     the tree's **first** `beforeLoad`, first `redirect` and first store read
     from a route file (§2.7) — and it is why those two generated route files
     are replaced by hand-written ones (§3).
     - **Contingency, pre-authorised by me** (so VERIFY does not stall):
       if `redirect()` thrown from `beforeLoad` does not settle cleanly under
       `renderApp`'s memory history, the guard moves to a
       `<Navigate to="/employees" />` returned from the route component — still
       inside the route file, still no `useEffect`, and the URL contract is
       unchanged. **No change to `src/test/render-app.tsx` is authorised.**
- **(c) OTHER MODULES UNAFFECTED** — guaranteed structurally: nothing outside
  `src/features/employees/**` and `src/app/shell/role-switch.tsx` imports
  `role.store.ts`. A section test asserts it behaviourally: with the role set to
  `viewer`, `/tickets` still shows its **New ticket** button and its row-action
  menu.
- `remote-badge.tsx` mirrors `confirmed-badge.tsx`: `bg-success` + **Remote** /
  `bg-muted-foreground` + **On-site**.
- **Fixture**: 24 rows, deterministic, ids 1–24 ascending, unique emails, fixed
  literal `hiredAt` dates, exactly **9 remote / 15 on-site**, and at least
  **3 rows sharing one surname** so a `q` test can narrow to a known count.

### 1.3 Shared changes (mine, cross-cutting)

1. **`src/shared/stores/role.store.ts`** — new file (§1.2a). The second Zustand
   store in the tree and the first outside `mock.store.ts`.
2. **`src/app/shell/role-switch.tsx`** — new file (§1.2a).
3. **`src/app/shell/app-sidebar.tsx`** — the footer gains `<RoleSwitch />` above
   `<MockIndicator />`. This is the **only** hand edit to a shared file in the
   batch (the NAV/import edits in the same file are made earlier and
   generatively by X1/X2), and it is assigned exclusively to **M2**.

No other shared file changes. `mocks/core/errors.ts` (now 404/400/409/422/500),
`mocks/core/list-query.ts`, `src/shared/api/*`, `src/shared/domain/iso-date.ts`
and `src/shared/format/currency.ts` are reused or untouched; every shadcn
primitive needed (`select`, `switch`, `field`, `table`, `dropdown-menu`,
`alert-dialog`, `badge`) already exists and has proven importers.

---

## 2. Pattern inventory (scout report, incorporated)

Read-only sweep by the `scout` sub-agent over `AGENTS.md`, `DESIGN.md`,
`entities-benchmark.txt`, `plans/batch-3.md`, `plans/batch-4.md`,
`plan-directives/schematics.md`, all 10 schematics (`schema.json` +
`factory.ts` + `helper.ts`), `mocks/core/*`, the mock domains + fixtures +
specs, `src/shared/**`, `src/test/*`, `src/app/shell/*`, `src/routes/index.tsx`
and the events/tickets/payments/invoices/authors feature stacks. Findings I
re-verified myself are marked ✔.

### 2.1 Baseline module shape — generated vs hand-written

`default:crud-module` (`crud-module/factory.ts:25-38` ✔) composes nine atomics
in one call: `crud-api` → `crud-hooks` → `crud-routes` → `crud-create-page` →
`crud-edit-page` → `mock-route-keys` → `mock-domain-register` →
`sidebar-nav-entry` → `overview-card`. Inputs: `singular, plural, keyField,
keyType, label, icon, description, title, extraSearch, labelField`
(✔ `crud-module/schema.json`).

**Hand-written, always**: fixture, mock domain factory + spec, domain schema,
`<singular>-form.tsx`, `<plural>-page.tsx`, `<singular>-detail-page.tsx`,
section tests, e2e spec. Batch 3's **closed** verdict
(`plans/batch-3.md:494-546`), reaffirmed in batch 4 and not reopened here.

Batch 5 is repeats #14–15 of the generated skeleton — the last two.

### 2.2 `crud-create-page` vs the wizard (the one real shortfall)

✔ `crud-create-page/helper.ts:20-63` emits a **fixed wrapper**: imports
`<Singular>Form`, wires `useCreate<Singular>()`, and renders a static shell
(back-link, `<h1>New <singular></h1>`, `<Form submitLabel isPending serverError
onSubmit onCancel />`). It has no notion of steps, no local state, and never
enumerates fields.

Subscription's create page shares **none** of that structure: three internal
steps, local step state, a card radio group, per-step `trigger()` validation and
a single Confirm submit. The template cannot express it and no input would make
it. This is directive rule 3 territory — resolved in §3. `crud-edit-page` is
**unaffected**: the spec itself says Subscription's edit page is "a plain form
(no wizard)".

### 2.3 Enum with labels + Select (Payment's rule)

✔ `payment.ts:29` (`paymentMethods` const tuple), `:34`
(`z.enum(paymentMethods)`), `:44-51` (`PAYMENT_METHOD_LABELS`), consumed by the
form `Controller`+`Select`, the list cell (✔ `payments-page.tsx:197`), the
toolbar filter and the detail page. Subscription's `plan` is the last repeat.
**Deviation**: the wizard renders the enum as **cards**, not a `Select` — the
label map is reused, the control is not.

### 2.4 Two-schema domain split (wire optional / form `.omit()`)

✔ `src/features/events/domain/event.ts:55-63` — `eventUpsertSchema` keeps
`published` optional so `Partial<EventUpsert>` accepts the publish PATCH;
`eventFormSchema = eventUpsertSchema.omit({ published: true })` makes the field
structurally unreachable from a form. Batch 4 declared this the rule for
Subscription (`plans/batch-4.md:856-860`). **Deviation**: Event's rule is
symmetric (create *and* edit); Subscription's is asymmetric — `plan` is
required on the wire and in the create wizard, and omitted only from the edit
form. The mechanism (`.omit()` + `Partial<…Upsert>` on the generated hook) is
identical; the split point moves.

### 2.5 The wizard — confirmed no precedent

- ✔ `src/components/ui/tabs.tsx` exists with **zero importers** outside itself.
- ✔ No multi-step form anywhere; no page-level `useState` beyond delete targets
  and Shipment's selection set.
- ✔ RHF is v7.85.0, but **`trigger`, `getValues` and `watch` are called nowhere
  in `src/`** — all three are available, all three are unproven here.
- ✔ No selectable-card UI: `Card` is used as a `<Link>` wrapper on the overview
  page only; there is **no radio-group primitive** in `src/components/ui/`
  (`ls | grep radio` → empty) and no `<input type="radio">` anywhere in `src/`.
- ✔ DESIGN.md describes the selected state conceptually (`:429-431`, "Selected:
  surface-2 background, ink text — selected = surface lift") but ships no code.
- ✔ Every existing page-state mechanism is URL-driven via `validateSearch`;
  wizard step state is the first that must **not** be.

Nearest proven pieces: `FieldSet`/`FieldLegend` grouping
(`invoice-form.tsx:135-179`), the `<p role="alert">` field-error idiom, the
inline `serverError` channel, and the generated create page's toast+navigate
contract.

### 2.6 Row-menu instant PATCH — the `mutateAsync` rule

✔ Two instances, and they differ deliberately:
`invoice-paid-switch.tsx:24-36` uses `mutate(vars, { onError })` because a
`Switch` stays mounted; `ticket-open-toggle-item.tsx:29-46` uses
`mutateAsync(...).then().catch()` because selecting a Radix `DropdownMenuItem`
unmounts `DropdownMenuContent` before the PATCH settles, dropping call-level
callbacks. The file's own comment (`:12-28`) records the mechanism; batch 4
recorded it as a **declared rule** (`plans/batch-4.md:832-837`). Subscription's
"Renew" is exactly that control — mirror Ticket, not Invoice.

### 2.7 Role store, sidebar footer, route guard

- ✔ `src/shared/stores/mock.store.ts:38-63` is the **only** Zustand store:
  `create<T>((set, get) => ({ …state, …action }))`, no middleware, no
  persistence, consumed via the hook (`mock-indicator.tsx:11`).
- ✔ The sidebar footer exists and is exactly `app-sidebar.tsx:54-56`
  (`<div className="border-t p-3"><MockIndicator /></div>`). `NAV` is
  `NavEntry[]` at `:13-28` — 14 entries today (Overview + 13 modules), rendered
  at `:41-51`.
- ✔ `grep -rn "beforeLoad\|redirect(" src/routes/` → **zero hits**. There is no
  route guard of any kind, and **no `useEffect` anywhere in `src/`**.
  `redirect` is exported by the installed router
  (`@tanstack/react-router/dist/esm/index.d.ts:22`, v1.170.25 ✔). Reading a
  Zustand store from a route file has no precedent; `useRoleStore.getState()`
  is the standard API (zustand 5.0.14 ✔).
- ✔ No page conditionally hides New/Edit/Delete; `disabled=` appears only on
  pagination buttons and pending mutations. Viewer-mode gating is new as UI,
  though mechanically trivial.

### 2.8 Vanilla halves — Author is the template

✔ `authors.mock.ts` is the reference factory and the only existing domain with
**two** unique fields: `authors.has(body.authorId!)` → 409 and
`emailTaken(body.email!)` → 409 on POST (`:88-90`), plus
`emailTaken(merged.email, id)` on PATCH (`:108-110`). Employee needs exactly
this. Subscription needs only the single-key form (Payment/Ticket shape,
`tickets.mock.ts:100-102`).

### 2.9 Cross-cutting state

- ✔ `MockRouteKey`: **65** literals (`mocks/core/types.ts`); batch 5 adds 10 →
  **75**.
- ✔ `mocks/setup-test-mocking.ts` imports and resets **13** domains in the
  shared `afterEach`; batch 5 adds two, generatively.
- ✔ 13 e2e specs, 26 section test files, 13 mock-infra specs; 10 schematics with
  10 `*.test.ts` files (36 tests, unchanged since batch 3).
- ✔ `src/shared/api/pagination.ts` — `toQueryString` drops `undefined` and `''`;
  neither entity needs a filter, so `ListParams.filters` is unused this batch.
- ✔ `src/test/setup.ts:1-28` polyfills `matchMedia`, `ResizeObserver`,
  `scrollIntoView` and pointer capture — what makes Radix `Select`/`Switch`/
  `Checkbox` drivable in jsdom. Native radios need no polyfill.
- ✔ `renderApp(path)` (`src/test/render-app.tsx:11-30`) renders the **real**
  router — including the sidebar — so the role switch is present in every
  section test in the repo. That is why the store must be reset per test file
  (§1.2a) and why the new Select must be name-scoped (hazard 5).
- ✔ MSW per-test override idiom: `server.use(http.patch(`${TEST_BASE_URL}/…`,
  …))` (`tickets-page.test.tsx:129-142`) — the shape for Renew's failure toast.

### 2.10 Schematic coverage check

All 10 schematics re-read. **None needs extension or a sibling:**

- `crud-api` / `crud-hooks` — parameterised only by `singular, plural,
  keyField, keyType` (✔ `crud-hooks/helper.ts:16-85`); they never inspect other
  fields. Subscription's `plan` immutability and Employee's role gate live
  entirely in the domain and presentation layers. `useUpdateSubscription` takes
  `Partial<SubscriptionUpsert>`, which accepts both `{ renewals }` (Renew) and
  the plan-less edit values — by design (§1.1c), so nothing generated is
  patched.
- `crud-routes` — both entities pass an empty `extraSearch`; the generated
  `index.tsx`/`$key/index.tsx` are used verbatim. Only Employee's `new.tsx` and
  `$employeeId/edit.tsx` deviate (§3).
- `crud-create-page` — used as-is for Employee; **falls short for Subscription**
  (§2.2, resolved in §3).
- `crud-edit-page` — used as-is for both.
- `mock-route-keys`, `mock-domain-register`, `sidebar-nav-entry`,
  `overview-card` — additive, idempotent text edits, unaffected by field shape.
  ✔ `mock-domain-register` only rewrites `handlers.ts` and
  `setup-test-mocking.ts`; it does not require the domain file to exist yet, so
  running the generator before the mechanic writes the domain is safe **only if
  the domain lands before any test runs** — which the delegation order
  guarantees (§4).
- `crud-module` — composition order holds for both entities.

### 2.11 Hazards carried forward

| # | Hazard | Recorded | Applies to |
|---|---|---|---|
| 1 | Playwright/TL strict-mode collisions on short labels **and on toast-vs-content text** | `plans/batch-4.md:872-873` | **Both.** `{ exact: true }` is pre-authorised from the start on every `getByLabel`/`getByText` in both e2e specs. Specific traps: `Plan`/`Basic`/`Pro` appear in cards, summary and toast; `Renew` appears in the menu item and the toast; Employee's `fullName` appears in the row, the heading and the update toast. |
| 2 | A detail page refetching shows its skeleton first — assert with `findBy*` after any mutation | `plans/batch-2.md:454-457` | **Subscription** (Renew re-renders the row), **Employee** (role flips re-render the list). |
| 3 | Never assert a bare path with `toHaveURL` against a list route — the router writes search defaults (`/x?page=1&q=`) | `plans/batch-3.md:750-759` | **Subscription** (Renew must not lose page/search state — capture `page.url()` before, assert byte-identity after), **Employee** (the Viewer redirect lands on the list; match with a regex, never a bare path). |
| 4 | Never assume a fixture row is on page 1 — search first or check its sort position | `plans/batch-4.md:806-810` | **Both**; ids 1–24 sort ascending, so anything above 10 needs the search box. |
| 5 | **New**: the sidebar now renders a role `Select` on every page, and the sidebar header already renders the text `Admin` | this batch (§1.2a) | **Every** test file, but only the employees tests touch it. Role locators go through `getByRole('combobox', { name: 'Role' })` / `getByRole('option', { name: … })`; `getByText('Admin')` is banned. |
| 6 | **New**: the role store is module-global and survives across tests in a file | this batch (§1.2a) | Employees section tests reset it in `beforeEach`. |
| 7 | **New**: a Radix `Select` with no default logs an uncontrolled→controlled warning | `plans/batch-3.md:760-766` | Not applicable — the role Select is always controlled from `role`, which is never undefined. Recorded so the mechanic does not "fix" it. |

---

## 3. Schematic decisions

Directive: extract from proven code, bottom-up, one schematic per atomic
pattern, composites only from proven pieces, never a master generator. Rule 1
requires a proven instance **and 3 or more repeats ahead**.

**The controlling arithmetic**: this is the final batch. **Zero** entities
follow it, so *nothing* introduced or repeated here can reach rule 1's bar. Every
"none" below is that arithmetic, not reluctance.

| Pattern | Established? | Action | Rationale (proven instance · repetitions ahead · variation points) |
|---|---|---|---|
| Module skeleton (api + hooks + routes + create/edit pages + 4 registrations) | ✅ proven ×13 | **use** `default:crud-module` ×2 | Repeats #14–15, the last two. Both pass an empty `extraSearch`. Nothing generated is hand-patched except the three files named below, each replaced wholesale and recorded. |
| Create page | ✅ proven ×13 | **use as-is for Employee; NOT USED for Subscription** | Rule 3 — the schematic falls short. The wizard shares no structure with the template (§2.2), so the generated `subscription-create-page.tsx` is **replaced wholesale by a hand-written file**, never patched line-by-line. Extending `crud-create-page` with wizard options would pile a one-off option onto a generator with **zero** future consumers, which the directive's granularity rule forbids; a sibling `crud-wizard-page` schematic would be executed exactly once and is equally unjustified. The deviation is recorded here, which is what "never silently" requires. |
| Edit page | ✅ proven ×13 | **use as-is ×2** | Subscription's edit page is explicitly "a plain form (no wizard)"; Employee's is vanilla. Both compile unchanged against the plan-less / standard form value types. |
| List + detail routes | ✅ proven ×13 | **use as-is ×2** | Empty `extraSearch`, so the generated files are byte-identical to the Author reference. |
| `new` / `$key/edit` routes **with a guard** | ❌ new | **hand-written for Employee only, replacing the two generated files — recorded** | Same rule-3 reasoning as the wizard: a `beforeLoad` guard is legitimate route wiring (`AGENTS.md`: routes are the URL contract), and adding a `guard` input to `crud-routes` for a single consumer with zero repeats ahead is the option-piling the directive warns against. Two files, replaced wholesale, listed in §1.2. |
| Two-schema domain split (wire optional / form `.omit()`) | ✅ Event, declared rule | **use the rule by hand** | Subscription is the single forecast repeat; zero remain after it. New variation point: asymmetric (writable at create, absent at edit) — §2.4. |
| Instant row PATCH from a control that unmounts (`mutateAsync`) | ✅ Ticket, declared rule | **use the rule by hand** | Subscription's Renew is the single forecast repeat; zero remain. Mirror `ticket-open-toggle-item.tsx` verbatim. |
| Enum-with-labels in the domain | ✅ Payment, declared rule | **use the rule by hand** | Last repeat. Control differs (cards, not Select); the label map does not. |
| Dual-unique-field mock (id + email) | ✅ Author ×1 | **hand-mirror** | Employee is instance #2 of 2 in the whole schedule. |
| Multi-step create wizard | ❌ new | **hand-built, no schematic, not even a declared rule** | Zero repeats ahead — a one-off by construction. |
| Selectable radio cards | ❌ new | **hand-built** | Zero repeats ahead. Native radios + `has-[:checked]` styling; no new UI primitive is added to `src/components/ui/` (that directory is generated shadcn output and is not hand-edited). |
| Role store + sidebar switch + route guard + role-gated UI | ❌ new | **hand-built** | Zero repeats ahead. The store mirrors `mock.store.ts`'s shape; everything else is first-of-its-kind. |
| Mock domain factory + fixture | ✅ ×13 | **defer — final** | Closed in batch 4 as *never* (`plans/batch-4.md:626`): it still needs the per-entity "kind of entity" switch the directive forbids, and there is no batch left to build it for. |
| List page / detail page / form | ✅ ×13, chrome only | **none — closed in batch 3** | Not reopened. |
| Section tests / e2e specs / domain schema | ✅ ×13 | **none — permanent** | Assertions and shapes are the per-entity specification. |

Net: **no schematic is created, extended or patched in batch 5.** The existing
ten are executed twice; three generated files (Subscription's create page,
Employee's `new` and `edit` routes) are replaced wholesale by hand-written ones,
each recorded above with its rule-3 reasoning. `pnpm test:schematics` must stay
at 36 tests / 10 files.

---

## 4. Delegation plan

Every delegation is a **blocking** call carrying: the exact files to produce,
the reference pattern to mirror (pointed at an existing module), the entity's
spec lines from `entities-benchmark.txt`, and the tests it must include. I
review each delivery against this plan before moving on. Design decisions stay
in this file; the mechanic makes none.

| # | Unit | Depends on | Who |
|---|---|---|---|
| **X0** | Load the pbuilder skill router (`.claude/skills/pbuilder/SKILL.md`) before any `builder` command — the AGENTS.md-mandated entry point, carrying the hazards (no dry-run; run `execute` standalone). | — | me |
| **X1** | `builder execute default:crud-module` for **subscriptions** — standalone, one shell call. Read every file it wrote/edited. | X0 | me |
| **X2** | Same for **employees**. | X1 | me |
| **M1** | Subscription module: fixture (24 rows, 8/9/7 plans, 15/9 active), mock + spec, domain schema (three-schema split), list page with the Renew row item, **the hand-written 3-step wizard** replacing the generated create page, edit form (no `plan`), detail page, `active-badge.tsx`, `subscription-renew-item.tsx`, 3 section tests, `e2e/subscriptions.spec.ts`. | X2 | mechanic |
| **M2** | Employee module: `src/shared/stores/role.store.ts`, `src/app/shell/role-switch.tsx`, the `app-sidebar.tsx` footer edit, fixture (24 rows, 9 remote), mock + spec (dual uniqueness), domain schema, list page + detail page with the Admin gate, form, `remote-badge.tsx`, the two guarded route files, 3 section tests, `e2e/employees.spec.ts`. | X2 | mechanic |
| **V** | All four gates + `pnpm test:schematics`; diagnose, fix (mechanical fixes re-delegated), re-run until green. | M1, M2 | me |

X1 and X2 are sequential because each writes to the same five shared
registration files (`mocks/core/types.ts`, `mocks/handlers.ts`,
`mocks/setup-test-mocking.ts`, `src/app/shell/app-sidebar.tsx`,
`src/routes/index.tsx`) and `builder execute` must run standalone, one per shell
call (pbuilder guardrail).

M1 and M2 touch **disjoint** file sets — their own `src/features/<plural>/**`,
`mocks/{fixtures,domains}/<plural>*`, `e2e/<plural>.spec.ts`, their own route
files, plus `src/shared/stores/role.store.ts`, `src/app/shell/role-switch.tsx`
and the `app-sidebar.tsx` footer for **M2 alone** — because X1–X2 have already
made every shared registration edit. They therefore run **in parallel in one
message**, each blocking.

---

## 5. Verification plan

Per module, before the batch is called done.

**Both (baseline every module must pass)**

- mock spec: default page of 10 with `total` 24 · last-page remainder · `q`
  narrowing across the declared string fields · `GET` 200 and 404 · `POST` 201
  with the boolean/`renewals` defaulted, 400 invalid, 409 duplicate key ·
  `PATCH` partial merge + 404 · `DELETE` 204 then 404.
- section (list): renders page 1 from the API · search narrows · Next
  paginates · row-menu delete removes the row and updates the count.
- section (form): empty submit shows field errors and does not navigate ·
  create succeeds and returns to the list · duplicate key surfaces the server
  409 text without navigating.
- e2e: list + pagination · search · create · detail → edit · delete ·
  duplicate-key conflict · axe scan (no serious/critical) on list and form.

**Subscription (T3)** — plus one test per heavy-workflow clause:

- (a) **wizard**: step 1 renders three plan radios and nothing else; `Next`
  without a plan keeps step 1 and shows the plan error; choosing **Pro** and
  pressing `Next` reaches step 2; `Back` returns to step 1 with **Pro still
  selected**; `Next` again shows step 2 **with the values typed earlier still
  there** (this is the spec's "Back/Next preserve entered values", asserted in
  both directions); step 3 shows a read-only summary containing the plan
  **label** (never `pro`), the id, the date and `Yes`/`No`.
- (a) **step state is not in the URL**: the router's location stays
  `/subscriptions/new` across every step change (section test asserts
  `router.state.location.pathname` and that the search string is unchanged).
- (b) **each step validates before Next**: step 2's `Next` with an empty id/date
  shows both field errors and does not advance; **Confirm submits once** — the
  section test counts POST requests through an MSW override and asserts exactly
  one, and asserts the created record carries `renewals: 0` (the create default
  the wizard never collects).
- (b) a duplicate `subscriptionId` on Confirm surfaces the mock's 409 text
  inline on step 3 and does not navigate.
- (c) **Renew**: the row menu's `Renew` PATCHes the row, shows a toast
  containing the **new** count from the response, the row's Renewals cell
  increments, and the list keeps its page and search text (section, asserted
  with `findBy*`); a failing PATCH raises an error toast (section, via a
  one-off MSW 500 override); e2e captures `page.url()` before the click and
  asserts byte-identity after (hazard 3).
- (c) **edit cannot change plan**: the edit form renders **no** control whose
  accessible name is `Plan` (no radio, no combobox, no textbox — asserted by
  absence), the plan is visible as read-only text, and saving an edit sends a
  payload with no `plan` key (section, via an MSW spy override that captures the
  PATCH body). The mock spec additionally asserts a PATCH that *does* carry a
  `plan` still merges (the wire is not the guard — the type system is), so the
  test documents where the guarantee lives.
- mock spec asserts the fixture split 8 basic / 9 pro / 7 enterprise via
  `?q=enterprise` → 7, and `renewals` defaulting to 0 when omitted on POST.

**Employee (T3)** — plus one test per heavy-workflow clause:

- (a) the sidebar footer renders a `Role` combobox whose default value is
  **Admin**; choosing **Viewer** updates the store (section, name-scoped
  locators per hazard 5).
- (b) as **Viewer**: `/employees` renders its rows and total but shows **no**
  "New employee" button and **no** row-action menu; `/employees/$id` renders the
  record but shows no `Edit` link and no `Delete` button; rendering
  `/employees/new` lands on the **list** (`router.state.location.pathname ===
  '/employees'`) and rendering `/employees/$id/edit` does the same. As
  **Admin**, all four controls are present (the same assertions, inverted).
- (c) with the role set to **Viewer**, `/tickets` still shows its "New ticket"
  button and its row-action trigger — other modules are unaffected (section).
- e2e: drive the sidebar `Role` combobox to **Viewer**, assert the New button
  disappears and a direct `goto('/employees/new')` ends on `/employees`
  (regex-matched, hazard 3); switch back to **Admin** and assert the controls
  return; axe scan the list in **both** roles plus the form as Admin.
- mock spec asserts a duplicate `email` 409s on POST **and** on PATCH (excluding
  the record's own email), mirroring Author.

**Schematics** — `pnpm test:schematics` green and unchanged (36 tests / 10
files); no schematic file is edited this batch, so any movement here is a
regression to investigate, not an expected delta.

**Batch gates** — run by me, in the foreground, until all green:

```bash
pnpm typecheck && pnpm lint && pnpm test:run && pnpm test:e2e
```

Expected end state: 15 sidebar entries (16 NAV lines with Overview) + 15
overview cards, `MockRouteKey` at **75** literals, 15 mock domains all reset in
the shared `afterEach`, 15 e2e specs, **10** schematics still registered and
unmodified, two new shell/shared files (`role.store.ts`, `role-switch.tsx`) and
one hand edit to the sidebar footer, three generated files replaced wholesale
and recorded (§3), and the thirteen earlier modules otherwise untouched and
still green.

---

## 6. Outcome (batch closed)

All four gates green **in one chain, run in the foreground by me** (`pnpm
typecheck && pnpm lint && pnpm test:run && pnpm test:e2e`, exit 0):

| Gate | Result | Baseline |
|---|---|---|
| `pnpm typecheck` | ✅ exit 0 | exit 0 |
| `pnpm lint` | ✅ exit 0 | exit 0 |
| `pnpm test:run` | ✅ 49 files / 395 tests | 41 / 335 |
| `pnpm test:e2e` | ✅ 118 passed | 102 |
| `pnpm test:schematics` | ✅ 36 tests / 10 files | 36 / 10 (unchanged, as predicted) |

End state matches §5's expectation exactly: **75** `MockRouteKey` literals, 16
NAV entries (Overview + 15 modules) and 15 overview cards, 15 mock domains all
reset in the shared `afterEach`, 15 e2e specs, 32 section-test files, **10
schematics registered and unmodified**, two new shared/shell files
(`role.store.ts`, `role-switch.tsx`) and one hand edit to the sidebar footer,
three generated files replaced wholesale and recorded (§3), and the thirteen
earlier modules untouched and still green.

Build sequence as planned: X0 (pbuilder skill) → X1 → X2 (`crud-module` run
standalone, one per shell call, for `subscriptions` and `employees`) → M1/M2 in
parallel → VERIFY. **No schematic was created, extended or patched** — §3's
central prediction held for the second batch running.

### Deviations from the plan, and fixes applied during VERIFY

- **A genuine spec-vs-design interaction the plan did not foresee: "no
  persistence" bounds what the route guard can be tested against.** The e2e
  spec asserted that a Viewer doing `page.goto('/employees/new')` lands on the
  list. It does not — and must not. A `goto` is a **full page load**, the role
  store is deliberately **not persisted** (spec 15a), so the app boots back into
  Admin and the guard correctly allows the route. The guard's real, reachable
  surface is a **client-side** navigation into the route, which is exactly what
  the section tests already prove (`renderApp('/employees/new')` with the store
  in `viewer` redirects to `/employees`). The e2e case was rewritten to prime
  the history with a client-side visit as Admin, switch to Viewer, and
  `goForward()` into the guarded route — plus an explicit assertion that a hard
  reload returns to Admin, so the no-persistence consequence is documented
  rather than looking like a hole. **Source unchanged; the design is correct and
  the assertion was wrong.** Declared for any future role work: a non-persisted
  role gate can only be exercised in-session.
- **`sr-only` radios are not clickable by Playwright's `.check()`.** The wizard's
  plan cards hide their native radio with `sr-only` inside the `<label>`; the
  card's own `<span>` intercepts the pointer event, so `.check()` retries until
  it times out. Fixed test-side by clicking the **card** — the actual user
  gesture, with the label forwarding the click — and then asserting
  `toBeChecked()` on the radio, which also pins the label↔input binding. jsdom
  has no hit-testing, which is why the section tests never saw this. **New
  standing hazard**: a visually-hidden input must be driven through its visible
  label in Playwright, never by `.check()`/`.click()` on the input.
- **Two locator errors in `e2e/employees.spec.ts`**, both the mechanic assuming
  the *name* is the row link. The plan's column order makes **Employee #** the
  link and the name a plain cell (§1.2). Retargeted at the id link, with the
  name asserted as text alongside. This is standing hazard 1 in its
  "wrong-element-same-text" form.
- **`ByRoleOptions` has no `exact` field in Testing Library**, so hazard 1's
  `{ exact: true }` cannot be applied to `getByRole` in section tests (role-name
  matching is already exact for string names). The Subscription mechanic hit
  this at `tsc -b` and dropped it from `getByRole` only — matching what every
  other section test in the tree already does. Same finding as batch 4
  (`plans/batch-4.md:845-846`); it belongs in the hazard's wording, not in each
  mechanic's rediscovery.
- **Mechanic-level choices inside the specified design, accepted on review**:
  the Subscription fixture exceeds its floors (10 rows at `renewals: 0` against
  a floor of 6); the Employee role-access test adds two Admin-side route-render
  assertions as the inverse of the redirect cases; both mechanics wrote the
  house-style doc comments the plan asked for, including the wizard's
  `shouldUnregister`/Enter-guard rationale and the store's
  why-shared-but-gated-in-the-feature note.
- Everything else landed as planned. The three rule-3 file replacements
  (Subscription's create page, Employee's `new` and `$employeeId/edit` routes)
  are the only generated output that differs from what the schematics wrote, and
  each carries a header comment saying so.

### Schedule closed

Batch 5 is the last batch: all **15** entities from `entities-benchmark.txt` are
built, every tier quirk implemented and tested, and the four gates are green
across the whole tree. Nothing is carried forward.
