# Batch 1 — Book [T1], Category [T1], Review [T2]

Orchestrated per `HARNESS.md`. Authority on architecture: `AGENTS.md`.
Design language: `DESIGN.md` (already embodied by the Authors reference —
mirroring Authors *is* the design compliance path).

---

## 1. Modules

### 1.1 Book [T1] — `books` / `book`, key `isbn` (string)

| Field | Type | Rules |
|---|---|---|
| `isbn` | string | required, **unique** (lookup key, 409 on duplicate create) |
| `title` | string | required |
| `pages` | number | required, int, min 1 |
| `publishedAt` | date | optional (`'' → undefined`), `YYYY-MM-DD` |
| `inPrint` | boolean | required, default `true` |

Files:

```
src/features/books/domain/book.ts
src/features/books/infrastructure/books.api.ts
src/features/books/application/use-books.ts
src/features/books/presentation/books-page.tsx
src/features/books/presentation/book-form.tsx
src/features/books/presentation/book-create-page.tsx
src/features/books/presentation/book-edit-page.tsx
src/features/books/presentation/book-detail-page.tsx
src/features/books/presentation/book-status-badge.tsx
src/features/books/presentation/books-page.test.tsx
src/features/books/presentation/book-form.test.tsx
src/routes/books/index.tsx            (validateSearch: page, q)
src/routes/books/new.tsx
src/routes/books/$isbn/index.tsx
src/routes/books/$isbn/edit.tsx
mocks/fixtures/books.fixture.ts       (24 rows)
mocks/domains/books.mock.ts           (+ exported `findBook(isbn)`)
mocks/domains/books.mock.spec.ts
e2e/books.spec.ts
```

Registration edits: `mocks/core/types.ts` (`LIST_BOOKS|GET_BOOK|CREATE_BOOK|
UPDATE_BOOK|DELETE_BOOK`), `mocks/handlers.ts`, `mocks/setup-test-mocking.ts`,
`src/app/shell/app-sidebar.tsx`, `src/routes/index.tsx`.

### 1.2 Category [T1] — `categories` / `category`, key `code` (string)

| Field | Type | Rules |
|---|---|---|
| `code` | string | required, **unique** (lookup key) |
| `name` | string | required |
| `description` | string | optional |
| `enabled` | boolean | required, default `true` |

Same file set with `categories`/`category`/`$code`; route keys
`LIST_CATEGORIES|GET_CATEGORY|CREATE_CATEGORY|UPDATE_CATEGORY|DELETE_CATEGORY`.
Pure rename of the Authors shape — **zero new field types**.

### 1.3 Review [T2] — `reviews` / `review`, key `reviewId` (number)

| Field | Type | Rules |
|---|---|---|
| `reviewId` | number | required, int, **unique** (lookup key) |
| `bookIsbn` | string | required, **RELATION → Book.isbn** |
| `rating` | number | required, int, 1..5 |
| `comment` | string | optional |
| `verified` | boolean | required, default `false` |
| `reviewedAt` | date | required |

Extra files beyond the standard set:

```
src/features/reviews/presentation/star-rating.tsx        (quirk b)
src/features/reviews/presentation/book-combobox.tsx      (quirk a)
```

Quirk implementation contract (design decisions — fixed here, not by the
mechanic):

- **a. RELATION.** `book-combobox.tsx` = `Popover` + `Command`
  (`src/components/ui/{popover,command}.tsx`, already present, first use).
  It searches the **books list endpoint** through Books' application hook
  `useBooksList({ q, pageSize: 10 })` (cross-feature import of another
  feature's *application* layer is allowed for relations; the relation
  always points at a same/earlier-batch entity). Options render as
  `title (isbn)`. The trigger is a `combobox`-role button labelled
  `Book`; the popover's search box is labelled `Search books`.
  Free typing is supported through a "Use “<typed>”" command item that
  commits the raw string. Existence validation on submit:
  `book-form.tsx` calls `booksApi.get(isbn)` before mutating; a rejection
  ⇒ `setError('bookIsbn', { message: 'No book with that ISBN' })` — a
  **field error**, no navigation. The reviews mock is the server-side
  backstop: unknown `bookIsbn` ⇒ 400 `bookIsbn <x> does not exist`.
- **b. STARS.** `star-rating.tsx` renders
  `<span role="img" aria-label="{n} of 5">★★★★☆</span>` (n filled `★`,
  `5-n` hollow `☆`). Used in the list *and* the detail page.
- **c. VERIFIED FILTER.** Route search schema gains
  `verified: z.boolean().optional().catch(undefined)`; toolbar `Switch`
  labelled `Verified only` writes `?verified=true` (ON) / removes the param
  (OFF) and resets `page` to 1. The value is forwarded to
  `GET /reviews?verified=true`, and the **mock endpoint** does the filtering.

Shared-layer change this requires (design decision, done by the
orchestrator, not the mechanic):

`src/shared/api/pagination.ts` — `ListParams` becomes a type alias and
`toQueryString` accepts `ListParams & Record<string, string | number |
boolean | undefined>`, serialising any extra scalar key. Behaviour for
`page`/`pageSize`/`q` is unchanged (page omitted when ≤ 1, `q` trimmed and
omitted when blank, empty/undefined values skipped). This is the mechanism
the remaining schedule needs 4 more times (Coupon `?status`, Payment
`?method`, Ticket `?from&to`, Event `?published`).

---

## 2. Pattern inventory (scout report, incorporated)

### 2.1 Established, proven, gates-green

The **Authors module** is the single proven instance and covers the whole
vanilla CRUD shape: unique key + required strings + optional string +
boolean-with-default, list (search/paginate/row-menu/delete+AlertDialog),
RHF+zodResolver form with server-conflict surfacing, TanStack Query key
factory + 5 hooks, MSW in-memory `Map` domain with 200/201/204/400/404/409
semantics, 4 thin routes, section tests, e2e + axe.

Reference files: `src/features/authors/**`, `src/routes/authors/**`,
`mocks/domains/authors.mock.ts(.spec.ts)`, `mocks/fixtures/authors.fixture.ts`,
`e2e/authors.spec.ts`.

**Repetition ahead:** 14 entities total (2–15). Batch 1 uses it 3×; the full
remaining schedule uses it 14×. Far past the 3× extraction threshold.

The five mechanical registration edits, each firing exactly once per entity —
**3× this batch, 14× across the schedule**:

| File | Edit shape |
|---|---|
| `mocks/core/types.ts` | append 5 literals to the `MockRouteKey` union |
| `mocks/handlers.ts` | one import + one `...xHandlers(config, base)` spread |
| `mocks/setup-test-mocking.ts` | one import + one `resetX()` in `afterEach` |
| `src/app/shell/app-sidebar.tsx` | one lucide import + one `NAV` entry |
| `src/routes/index.tsx` | one lucide import + one `<Link><Card>` block |

### 2.2 New — no instance in the tree

| Pattern | First needed | Repeats across schedule |
|---|---|---|
| native `<input type="date">` + `YYYY-MM-DD` list rendering | Book, Review | 10 / 14 entities |
| number field with min/range beyond a positive-int key | Book `pages`, Review `rating` | 10 / 14 |
| extra URL search param beyond `page`/`q`, applied by the list endpoint | Review `?verified` | 5 / 14 (boolean flavour 1×) |
| relation via async combobox over another entity's list endpoint | Review → Book | **2 / 14** (Invoice → Supplier, batch 3) |
| star rating display | Review | **1 / 14** — unique to Review |

Primitives: everything needed already exists in `src/components/ui`
(`popover`, `command` for the combobox — generated, never yet consumed).
Nothing new to generate from shadcn. Star rating has no primitive and is a
small hand-written presentation component.

### 2.3 Deviations of each Batch-1 entity from the reference

- **Category** — none. Straight rename of Authors.
- **Book** — new *field types only* (number-with-min, optional date) inside
  otherwise identical layers.
- **Review** — structural: cross-feature relation (infrastructure + presentation
  + mock cross-domain lookup), first route `validateSearch` beyond `{page,q}`,
  first mock domain that reads another domain's store, first fixture with a
  referential-integrity constraint (`bookIsbn` must exist in the books fixture).

---

## 3. Schematic decisions

Per `plan-directives/schematics.md`. Crystallised **bottom-up**: the five
always-done registration edits first, one schematic each, tested in isolation;
the composite module generator built **only** from those proven helpers,
importing the same functions (`schematics/_lib/registration.ts`) rather than
re-implementing the edits inline.

| # | Pattern | Established? | Action | Rationale |
|---|---|---|---|---|
| 1 | route-key union entry (`mocks/core/types.ts`) | yes — Authors | **extract** → `default:mock-route-keys` | 14 repeats; single atomic edit; variation: entity SCREAMING name |
| 2 | handler registration (`mocks/handlers.ts`) | yes — Authors | **extract** → `default:mock-handler-register` | 14 repeats; variation: plural + factory name |
| 3 | test-reset registration (`mocks/setup-test-mocking.ts`) | yes — Authors | **extract** → `default:mock-reset-register` | 14 repeats; variation: plural + reset fn name |
| 4 | sidebar NAV entry (`app-sidebar.tsx`) | yes — Authors | **extract** → `default:sidebar-nav-entry` | 14 repeats; variation: path, label, lucide icon |
| 5 | overview card (`src/routes/index.tsx`) | yes — Authors | **extract** → `default:overview-card` | 14 repeats; variation: path, title, description, icon |
| 6 | full vanilla CRUD module (4 layers + 4 routes + mock domain + fixture + tests + e2e + all 5 registrations) | yes — Authors | **extract** → `default:crud-module`, composing #1–#5 | 14 repeats of the skeleton, 4 of them pure-vanilla (Book, Category, Supplier, Vehicle); variation points: singular/plural/labels/icon/key field/field list (DSL)/descriptions |
| 7 | relation async combobox | **no** — no instance | **defer** (build by hand) | rule 2: build the first instance by hand; only 2 occurrences in the whole schedule (Review→Book now, Invoice→Supplier in batch 3) — below the 3× threshold. Declared the rule for Invoice. |
| 8 | extra URL-driven list filter | **no** — no instance | **defer** (build by hand, declare the rule) | 5 occurrences ahead, but zero proven instances today. Review proves it this batch; extractable at the batch-2 plan (Coupon `?status`). The shared enabler (`toQueryString` extras) lands now. |
| 9 | star rating | **no** | **none** | 1 occurrence, ever. Bespoke by definition. |
| 10 | conditional/cross-field validation, bulk/inline row actions, wizards, role gating | **no** | **none this batch** | not in batch 1; revisit at their batch plans |

**Granularity guard.** `crud-module` is deliberately *not* a master generator:
it emits the vanilla T1 shape only. Every T2/T3 quirk (relation, filters,
conditional rules, wizards, role gating) is out of scope for it. When a later
entity deviates, the choice is a **sibling** schematic, never more options on
this one (directive rule 3).

**Review is NOT generated then patched.** Its quirks touch the very files the
generator emits (list page, form, domain, mock, route), so generating and then
editing would be "silently patching generated output". Decision: Review is
hand-built by the mechanic against Authors + the freshly generated Books
module, and it *does* use atomic schematics #1–#5 for its registration edits.
That gives the atomic schematics 3 uses in this batch alone.

**Fixture data.** `crud-module` emits a 24-row fixture with deterministic
values, and every generated test is **fixture-driven** (imports the fixture and
asserts against `X_FIXTURE[i].field` / `X_FIXTURE.length`, never a hardcoded
literal). Consequence: curating fixture *values* afterwards cannot break the
generated tests. Curating values is data ownership, not shape patching, and is
an explicit planned step for Book and Category.

**`findX(key)` in generated mocks.** The generator emits an exported
`find<Singular>(key)` accessor in every mock domain (Authors has none). This is
uniform across all generated domains and is what a relation's server-side
validation reads (Review → `findBook`), so no generated file ever needs a
hand-added export.

**Testing the schematics.** `bun test schematics` via a new
`pnpm test:schematics` script, using `runFactoryForTest` from
`@pbuilder/sdk/testing` with `packageDir: import.meta.dir`. Each atomic
schematic is asserted for correct insertion **and idempotence** (re-running
against an already-registered tree writes nothing). `schematics/` is
gitignored, outside `tsconfig` includes and outside the vitest `include`
globs, so schematic sources never enter the app's four gates.

---

## 4. Delegation plan

Every delegation is a blocking `mechanic` call; parallel units go out in one
message. The orchestrator scaffolds all schematics itself first, because
`builder new schematic` mutates the shared `project-builder.json` and
concurrent scaffolds would race.

| Wave | Unit | Owner | Depends on |
|---|---|---|---|
| 0 | `builder new collection`/`new schematic` scaffolds ×6; `pnpm test:schematics` script | orchestrator | — |
| A1 | `schematics/_lib/registration.ts` (shared helpers) + the 5 atomic schematic factories/schemas + `*.test.ts` | mechanic #1 | wave 0 |
| A2 | `crud-module` factory (emitters for all ~20 files, field DSL parser) + `*.test.ts` | mechanic #2 | wave 0 + the frozen helper signatures below |
| B | orchestrator runs `bun test schematics`, fixes, then `builder execute default:crud-module` for **books**, then for **categories** (standalone, one per shell call); reviews every written file against the plan | orchestrator | A1, A2 |
| C1 | curate `books.fixture.ts` + `categories.fixture.ts` to realistic domain data (values only, referential shape untouched) | mechanic #3 | B |
| C2 | `src/shared/api/pagination.ts` extras support | orchestrator | — |
| D | Review module (all files in §1.3, incl. star rating + combobox + verified filter + tests + e2e) | mechanic #4 | B, C2 |
| E | four gates + fixes | orchestrator (mechanical fixes → mechanic) | all |

**Frozen helper signatures** (`schematics/_lib/registration.ts`) — A1 and A2
are written against these in parallel; all are idempotent, all are
read → transform → `replaceContent` string surgery (one mechanism per file; no
AST dialect, so a file is never touched twice by two mechanisms in one run):

```ts
addRouteKeys(singular: string, plural: string): Promise<void>
registerHandlers(singular: string, plural: string): Promise<void>
registerReset(plural: string): Promise<void>
addNavEntry(plural: string, label: string, icon: string): Promise<void>
addOverviewCard(plural: string, label: string, description: string, icon: string): Promise<void>
registerAll(input: RegistrationInput): Promise<void>  // all five, used by crud-module
```

Naming rules the helpers encode (derived from Authors): route keys are
`LIST_<PLURAL_UPPER>`, `GET_<SINGULAR_UPPER>`, `CREATE_<SINGULAR_UPPER>`,
`UPDATE_<SINGULAR_UPPER>`, `DELETE_<SINGULAR_UPPER>`; handler factory is
`<singular>Handlers`; reset is `reset<PluralPascal>`.

---

## 5. Verification plan

Per module, before it is considered delivered:

1. **Mock-infra spec** (`mocks/domains/<plural>.mock.spec.ts`) — default page
   size 10 over a 24-row fixture, page-3 remainder, `q` across string fields,
   `GET` 200 + 404, `POST` 201 with boolean default applied, 400 invalid,
   409 duplicate unique key, `PATCH` partial merge, `DELETE` 204 then 404,
   reseed-between-tests. Review adds: `?verified=true` filtering and 400 on an
   unknown `bookIsbn`.
2. **Section tests** — list: renders page 1 from the API, searches, paginates,
   deletes via row menu + confirm; form: validation errors on empty submit
   (no navigation), successful create returns to the list, server 409 surfaced
   in the form. Review adds: stars rendered with the `N of 5` label, the
   Verified-only toggle driving the URL + list, combobox selection, and the
   unknown-ISBN field error.
3. **E2E** (`e2e/<plural>.spec.ts`) — list+paginate, search, create, detail,
   edit, delete, duplicate-key server error, and an axe scan (no serious /
   critical violations) on the list and form pages. Review's e2e additionally
   exercises the combobox, the verified filter and the star labels.
4. **Schematic tests** — `pnpm test:schematics` green, including idempotence
   for each of the five registration helpers.
5. **Gates** — `pnpm typecheck && pnpm lint && pnpm test:run && pnpm test:e2e`,
   run by the orchestrator in the foreground, all four green.

---

## 6. Outcome (as built)

All four gates green in one foreground chain: **69 vitest tests / 12 files**,
**30 Playwright tests** (incl. an axe scan per module), typecheck and lint
clean. Schematic suite: **21 bun tests / 6 files**.

- **Book** and **Category** were GENERATED by `default:crud-module`
  (24 files written per run, including all five registration edits). Neither
  generated module was hand-patched; only their fixture VALUES were curated
  afterwards, as planned.
- **Review** was hand-built per §3 rule 2, and consumed the five atomic
  schematics for its registration edits — which is what proved them on a
  module the composite generator never touched.
- Fixture curation held the two load-bearing invariants the generated tests
  depend on: 24 rows, sorted ascending by the lookup key.

### Deviations and fixes during the build

1. `registerHandlers` split the handler array on *every* comma, so
   `...authorHandlers(config, base)` reflowed across two lines. Fixed in
   `schematics/_lib/registration.ts` with a paren-depth-aware
   `splitTopLevel`, the mangled `mocks/handlers.ts` was repaired, and
   `mock-handler-register.test.ts` now asserts the exact rendered array.
2. cmdk's `CommandInput` sets `aria-labelledby` to its own hidden hint label,
   which beat the `aria-label` and left the combobox search box with an empty
   accessible name. Fixed inside `book-combobox.tsx` by passing
   `<Command label="Search books">` — the shadcn primitive was NOT hand-edited.
3. One curated category description had to be reworded: it collided with the
   search term a generated section test derives from the fixture.

### Note for the next batch

`pnpm lint` (oxlint) honours `.gitignore`, and this harness gitignores every
non-Authors feature/mock/e2e path — so the lint gate does not actually scan
generated or newly built modules. Their type safety and style are enforced by
`tsc -b` (which does include them) and by mirroring the reference module, not
by oxlint. Worth knowing before trusting a green lint gate as coverage.

### Carried forward

- Rule declared for batch 2+: the **extra URL-driven list filter** now has a
  proven instance (Review `?verified`), so it is extractable at the batch-2
  plan (Coupon `?status`) — pattern #8 in §3.
- The **relation combobox** remains at 2 total occurrences; still `defer`,
  revisit when Invoice → Supplier lands in batch 3.
- `crud-module` stays vanilla-only. Every T2/T3 quirk gets a sibling
  schematic or hand-built code — never another option on it.
