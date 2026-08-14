# Batch 1 — Book [T1], Category [T1], Review [T2]

Orchestrated per `HARNESS.md`. Authority on architecture: `AGENTS.md`. Design
language: `DESIGN.md`. Plan directives incorporated: `plan-directives/schematics.md`
(decisions recorded under **Schematic decisions**).

Baseline measured before planning (reference module only):
`pnpm typecheck` ✅ · `pnpm lint` ✅ · `pnpm test:run` ✅ 3 files / 16 tests ·
`pnpm test:e2e` ✅ 7 passed. Every gate is green today, so any red during this
batch is ours.

---

## 1. Modules

### 1.1 Book [T1] — `books`, key `isbn: string`

| Field | Type / rules |
|---|---|
| `isbn` | string, required, **unique** (lookup key) |
| `title` | string, required |
| `pages` | number, required, min 1 |
| `publishedAt` | date (`YYYY-MM-DD`), optional |
| `inPrint` | boolean, required, default `true` |

Files:

```
mocks/fixtures/books.fixture.ts            24 rows (3 real pages)
mocks/domains/books.mock.ts                bookHandlers() + resetBooks()
mocks/domains/books.mock.spec.ts
mocks/core/types.ts                        + LIST_BOOKS GET_BOOK CREATE_BOOK UPDATE_BOOK DELETE_BOOK
mocks/handlers.ts                          + import/spread
mocks/setup-test-mocking.ts                + resetBooks()
src/features/books/domain/book.ts          bookSchema, bookUpsertSchema, bookKey()
src/features/books/infrastructure/books.api.ts        [generated]
src/features/books/application/use-books.ts           [generated]
src/features/books/presentation/books-page.tsx
src/features/books/presentation/book-form.tsx
src/features/books/presentation/book-create-page.tsx
src/features/books/presentation/book-edit-page.tsx
src/features/books/presentation/book-detail-page.tsx
src/features/books/presentation/in-print-badge.tsx
src/features/books/presentation/books-page.test.tsx
src/features/books/presentation/book-form.test.tsx
src/routes/books/index.tsx  new.tsx  $isbn/index.tsx  $isbn/edit.tsx   [generated]
src/app/shell/app-sidebar.tsx              + NAV line                  [generated edit]
src/routes/index.tsx                       + overview card             [generated edit]
e2e/books.spec.ts
```

List columns: ISBN · Title · Pages · Published (`YYYY-MM-DD`, `—` when unset) ·
Status (`In print` / `Out of print`) · row actions.

### 1.2 Category [T1] — `categories`, key `code: string`

| Field | Type / rules |
|---|---|
| `code` | string, required, **unique** (lookup key) |
| `name` | string, required |
| `description` | string, optional |
| `enabled` | boolean, required, default `true` |

Same file set as Book with `category`/`categories`, key param `$code`,
`enabled-badge.tsx`, `e2e/categories.spec.ts`. List columns: Code · Name ·
Description · Status · actions.

### 1.3 Review [T2] — `reviews`, key `reviewId: number`

| Field | Type / rules |
|---|---|
| `reviewId` | number, required, **unique** (lookup key) |
| `bookIsbn` | string, required — **RELATION → books** |
| `rating` | number, required, 1..5 |
| `comment` | string, optional |
| `verified` | boolean, required, default `false` |
| `reviewedAt` | date (`YYYY-MM-DD`), required |

Same file set plus `presentation/book-combobox.tsx` (relation input) and
`presentation/rating-stars.tsx`. List columns: ID · Book (`title (isbn)` when
resolvable, else the raw isbn) · Rating (★) · Reviewed · Verified · actions.

Quirk decisions (mine — the mechanic implements, never decides):

- **(a) RELATION.** `book-combobox.tsx` = `Popover` + `Command` (both shadcn
  primitives already in `src/components/ui/`, never wired before). It queries
  the **books list endpoint** through `useBooksList({ q, pageSize: 10 })` —
  a cross-feature *presentation → application* import, which keeps the
  inward-only dependency rule (nothing imports presentation). Options render
  as `title (isbn)`. Free typing is allowed: the typed text becomes the field
  value, and existence is enforced by an **async refinement** on the form
  schema (`reviewUpsertSchema.superRefine(async …)` calling `booksApi.get`),
  so an unknown isbn fails validation as a **field error** on `bookIsbn`
  (`Book "<isbn>" does not exist`) and never navigates. Server side, the
  reviews mock rejects an unknown `bookIsbn` with 400 as a second line of
  defence; the create page surfaces it in the form's server-error slot.
- **(b) RATING.** `rating-stars.tsx` renders `★★★★☆` with
  `aria-label="{n} of 5"` on the wrapper and `aria-hidden` on the glyphs.
- **(c) VERIFIED FILTER.** A `Switch` labelled "Verified only" wired to the
  list route's `validateSearch` (`verified: z.boolean().optional()`), pushed
  into the URL as `?verified=true`, forwarded through `ListParams` to
  `GET /reviews?verified=true`, and applied **by the mock list endpoint**
  (not client-side). Toggling resets `page` to 1 and preserves `q`.

### 1.4 Shared changes (mine, cross-cutting — decided here, built once)

1. **`src/shared/api/pagination.ts`** — `ListParams` gains an optional
   `filters?: Record<string, string | number | boolean | undefined>` bag and
   `toQueryString` serialises each defined, non-empty entry after
   `page/pageSize/q`. Rationale: five scheduled entities need a list filter
   beyond `page/pageSize/q` (Review `verified` now; Coupon `status`, Payment
   `method`, Ticket `from`/`to`, Event `status` later). Widening the shared
   contract once keeps `<plural>.api.ts` and `use-<plural>.ts` **byte-identical
   across all 15 entities**, which is what makes them safely generatable
   (§ Schematic decisions). Authors is unaffected (no filters passed).
2. **`src/shared/domain/iso-date.ts`** — `isoDateSchema` (`YYYY-MM-DD` regex,
   message `Use the YYYY-MM-DD format`) and `optionalIsoDateSchema`
   (`'' → undefined`). Dates are stored and transported as `YYYY-MM-DD`
   strings, rendered verbatim in lists and bound directly to
   `<input type="date">`. Rationale: 10 of the 14 remaining entities carry a
   date field; the first two land in this batch.
3. **`package.json`** — `"test:schematics": "bun test schematics"`. Schematic
   tests are `*.test.ts` under `schematics/`, outside vitest's `include`
   (`src/**`, `mocks/**`), so the app gates stay unpolluted.

---

## 2. Pattern inventory (scout report, incorporated)

Verified read-only sweep of the tree. Authors is the **only** established
instance of anything; `plans/` was empty (no earlier plan declared a rule) and
`project-builder.json` has `"collections": {}` — no schematic has ever been
extracted here.

### 2.1 Per module — exists vs new

Every artefact type in the AGENTS.md module drill (19 atomic shapes: fixture,
mock factory + reset, mock spec, route-key registration, `handlers.ts` spread,
`setup-test-mocking` reset, domain schema, api object, query hooks, list page,
form, create/edit/detail pages, 4 route files, sidebar NAV line, overview card,
section tests, e2e spec) is **established** by Authors and green. No batch-1
artefact type lacks a precedent; deviations are field-level:

**Book** — established shapes, three deviations: (i) **string** lookup key
(`isbn`) where Authors has a number — route params stay strings, no `Number()`
cast in the route wrapper, the key `<Input>` is `type="text"`; (ii) `pages` is
the first non-key numeric field with a `min` bound; (iii) `publishedAt` is the
first **date** field in the tree (no `type="date"` input and no date schema
exist anywhere — grep: 0 hits). `inPrint` maps 1:1 onto Authors' `active`.

**Category** — the closest possible repeat of Authors in the entire schedule:
`code`→string key (same deviation as Book), `name`→`fullName`,
`description`→`country` (optional trimmed string, `'' → undefined`),
`enabled`→`active`. Nothing else new.

**Review** — established shapes plus four genuinely new mechanisms: relation
field + cross-feature query (none exists), async combobox wiring
(`command.tsx`/`popover.tsx` exist but have **zero imports** outside
`components/ui/`), star renderer (none exists), and a list filter param beyond
`page/pageSize/q` plus the first boolean `validateSearch` entry (none exists).
`reviewId` matches `authorId` exactly; `comment` matches `country`;
`verified` is the first `default false` boolean; `reviewedAt` the first
*required* date.

### 2.2 Repetition — this batch and the remaining schedule

14 entities remain overall (Book, Category, Review + Supplier, Coupon,
Warehouse, Vehicle, Invoice, Payment, Shipment, Ticket, Event, Subscription,
Employee).

| Atomic shape | Batch 1 | Batches 2–5 | Total ahead |
|---|---|---|---|
| mock fixture (≥20 rows) | 3 | 11 | 14 |
| mock domain factory + `reset<X>()` | 3 | 11 | 14 |
| mock-infra spec | 3 | 11 | 14 |
| route-key registration (5 literals each) | 3 | 11 | 14 |
| `handlers.ts` import + spread | 3 | 11 | 14 |
| `setup-test-mocking.ts` import + reset call | 3 | 11 | 14 |
| domain schema file | 3 | 11 | 14 |
| infrastructure api object | 3 | 11 | 14 |
| application keys + 5 hooks | 3 | 11 | 14 |
| list page | 3 | 11 | 14 |
| form | 3 | 11 | 14 |
| create/edit/detail pages | 9 | 33 | 42 |
| route files | 12 | 44 | 56 |
| sidebar NAV line | 3 | 11 | 14 |
| overview card | 3 | 11 | 14 |
| section test files (≥2 each) | 6 | 22 | 28 |
| e2e spec | 3 | 11 | 14 |

`MockRouteKey` grows 5 → 20 after this batch → 75 at the end of the schedule.

Variation points beyond the pure Authors shape, by entity count:
date field **10** · boolean defaulting false **7** · extra URL list filter **5** ·
enum Select **3** · embedded object **3** · cross-field/conditional rule **3** ·
row-level PATCH action **3** · derived status badge **3** · currency **2** ·
relation combobox **2** · bulk action **1** · publish workflow **1** ·
create wizard **1** · role gating + global store **1** · star rating **1**.

### 2.3 Infrastructure facts respected by this plan

- `ListParams`/`toQueryString` (`src/shared/api/pagination.ts:9`) has no
  extension point today → widened once, here (§1.4.1).
- `MockRouteKey` (`mocks/core/types.ts:14`) is a flat literal union; growth is
  purely additive (5 literals per entity).
- `mocks/setup-test-mocking.ts` has one shared `afterEach`; each entity adds
  one import + one call to that same file.
- `src/routeTree.gen.ts` is generated by `@tanstack/router-plugin/vite`
  (`vite.config.ts:18`), gitignored, and regenerated automatically by
  `vite build` — which `pnpm typecheck` runs first. No manual step; new route
  files are picked up by the typecheck gate itself.
- `package.json:generate:types` runs `pbuilder-codegen` over `schematics/*/schema.json`
  — a no-op today because `schematics/` is empty. It becomes live in this batch.
- `builder` CLI v0.9.0 is on PATH; `builder info` reports zero collections.
- `tsconfig.app.json` includes `src`, `mocks`, `e2e` only — schematic factories
  are bun-run and outside the typecheck gate; oxlint still lints them.

---

## 3. Schematic decisions

Directive: extract from proven code, bottom-up, one schematic per atomic
pattern, composites only from proven pieces.

| Pattern | Established? | Action | Rationale (proven instance · repetitions · variation points) |
|---|---|---|---|
| Route-key registration (`mocks/core/types.ts`) | ✅ Authors | **extract** → `default:mock-route-keys` | `mocks/core/types.ts:14-19` · 14 ahead · vars: `singular`, `plural`. Pure additive union edit, idempotent. |
| Mock domain registration (`handlers.ts` spread + `setup-test-mocking.ts` reset) | ✅ Authors | **extract** → `default:mock-domain-register` | `mocks/handlers.ts:5,25` + `mocks/setup-test-mocking.ts:4,35` · 14 ahead · vars: `singular`, `plural`. One atomic action — AGENTS.md's drill states both edits as the single "register the domain" step; two files, one intent. |
| Sidebar NAV entry | ✅ Authors | **extract** → `default:sidebar-nav-entry` | `src/app/shell/app-sidebar.tsx:13-16` · 14 ahead · vars: `plural`, `label`, `icon`. |
| Overview card | ✅ Authors | **extract** → `default:overview-card` | `src/routes/index.tsx:21-35` · 14 ahead · vars: `plural`, `title`, `description`, `icon`. |
| Infrastructure api object | ✅ Authors | **extract** → `default:crud-api` | `src/features/authors/infrastructure/authors.api.ts` · 14 ahead · vars: `singular`, `plural`, `keyField`, `keyType`. Invariant once `ListParams` carries filters (§1.4.1). |
| Application keys + hooks | ✅ Authors | **extract** → `default:crud-hooks` | `src/features/authors/application/use-authors.ts` · 14 ahead · same 4 vars, otherwise byte-identical across entities. |
| Route files (list/new/detail/edit) | ✅ Authors | **extract** → `default:crud-routes` | `src/routes/authors/**` · 56 files ahead · vars: `singular`, `plural`, `keyParam`, `keyType`, plus **one** variation point `extraSearch` (raw Zod entries appended to `validateSearch`) covering the 5 entities with extra URL filters — Review is the first, so the variation point is exercised in this batch rather than speculated. |
| Whole-module composite | — (built from the seven above) | **new** → `default:crud-module` | Authored only **after** the seven atomics are proven — each unit-tested with `bun test schematics` **and** executed for real on Book. The composite imports the same helper modules the atomics wrap (`schematics/<name>/helper.ts`), never re-implementing an edit inline, and is then used for Category and Review. |
| Mock domain factory + fixture | ✅ Authors | **defer** (re-evaluate at batch 2) | The handler skeleton is invariant, but its body carries per-entity `validateUpsert`, the `q` search predicate, entity construction, uniqueness set, and (from Review on) extra query params and relation checks — more variation than a few points, and 5 of the 14 upcoming entities deviate further (embedded objects, enums, conditional rules). Crystallising it now would produce the master generator the directive forbids; three more instances land in this batch and make the true invariants visible. |
| List page / form / create-edit-detail pages | ✅ Authors | **defer** (re-evaluate at batch 3) | Column renderers, badges, filters, embedded fieldsets, enums, wizards and role gating vary per entity and per tier; only the page *chrome* is stable. Wait until the T2 shapes (batch 2–3) show which chrome is genuinely invariant. |
| Section tests / e2e spec | ✅ Authors | **defer** | Assertions are field- and quirk-specific; generating them would generate tests that assert nothing entity-true. |
| Domain Zod schema | ✅ Authors | **none** | Field-by-field bespoke by definition — it *is* the per-entity specification. |

Granularity rule applied: nothing above bundles two unrelated patterns, and no
schematic takes a "kind of entity" switch. Where an upcoming entity deviates
from what a schematic generates (Review's list route), the deviation is a
declared input (`extraSearch`), not a post-generation patch.

---

## 4. Delegation plan

Every delegation is a blocking `mechanic` call carrying: exact files, the
reference pattern to mirror, the entity's spec lines, and the tests required.
I review each delivery against this plan before the next step.

| # | Unit | Depends on | Delegate |
|---|---|---|---|
| **W1** | Shared prep: `ListParams.filters` + `toQueryString` serialisation, `src/shared/domain/iso-date.ts`, `test:schematics` script. Authors stays green. | — | mechanic |
| **S1** | Wiring schematics: `mock-route-keys`, `mock-domain-register`, `sidebar-nav-entry`, `overview-card` — scaffold with `builder new schematic`, real `schema.json` (+ `pbuilder-codegen`), factory delegating to a co-located `helper.ts`, `*.test.ts` via `runFactoryForTest`, idempotence asserted. | W1 | mechanic |
| **S2** | Skeleton schematics: `crud-api`, `crud-hooks`, `crud-routes` (with `extraSearch`), same authoring loop + tests, output byte-compared to the Authors originals. | W1 | mechanic |
| **X1** | I run `builder execute` standalone (one per shell call) for **Book**: 7 schematics → generated api/hooks/routes + 4 wiring edits. Read what each run wrote. | S1,S2 | me |
| **S3** | Composite `crud-module` importing the seven proven helpers; unit-tested. | X1 green | mechanic |
| **X2** | I run `crud-module` once for **Category** and once for **Review** (`extraSearch` = `verified`). | S3 | me |
| **M1** | Book module: fixture, mock domain + spec, domain schema, 6 presentation files, 2 section tests, e2e spec. | X1 | mechanic |
| **M2** | Category module: same set. | X2 | mechanic |
| **M3** | Review module + all three quirks: relation combobox, ★ renderer, verified URL filter; mock with relation validation + `verified` filter; tests covering each quirk. | X2, M1 (books endpoint must exist) | mechanic |
| **V** | Gates, diagnosis, fixes. | all | me |

M1 and M2 run in parallel (one message, both blocking). M3 follows M1 because
its combobox and its mock's relation check both need the books module.

---

## 5. Verification plan

Per module, before the batch is called done:

**Book / Category (T1)**
- mock spec: default page of 10 + `total` 24; page 3 remainder; `q` across the
  string fields; `GET` 200 + 404; `POST` 201 with the boolean defaulted, 400 on
  invalid, 409 on duplicate key; `PATCH` partial merge; `DELETE` 204 then 404.
- section (list): renders page 1 from the API · search narrows · Next paginates ·
  row-menu delete removes the row and updates the count.
- section (form): empty submit shows field errors and does not navigate ·
  create succeeds and returns to the list · duplicate key surfaces the server
  409 text without navigating.
- Book-specific: `publishedAt` renders `YYYY-MM-DD` (and `—` when unset);
  `pages` below 1 is a field error.
- e2e: list + pagination, search, create, detail → edit, delete, duplicate-key
  conflict, axe scan (no serious/critical) on list and form.

**Review (T2)** — everything above, plus one test per quirk:
- (a) selecting a book from the combobox fills `bookIsbn`; a free-typed unknown
  isbn produces a **field error** on `bookIsbn` and no navigation; the mock
  independently rejects an unknown isbn with 400 (mock spec).
- (b) a 4-star row exposes `★★★★☆` with the accessible label `4 of 5`.
- (c) toggling "Verified only" writes `?verified=true` to the URL, and the mock
  spec asserts `GET /reviews?verified=true` returns only verified rows;
  the toggle resets `page` to 1 and keeps `q`.
- e2e: full CRUD cycle including combobox selection, the verified filter, and
  an axe scan.

**Schematics** — `pnpm test:schematics` green (each schematic's factory tested
in isolation, including a second run proving idempotence for the four wiring
edits), and every generated file byte-checked against the Authors reference
shape by me during X1/X2.

**Batch gates** — run by me, in the foreground, until all green:

```bash
pnpm typecheck && pnpm lint && pnpm test:run && pnpm test:e2e
```

Expected end state: 4 sidebar entries + 4 overview cards, `MockRouteKey` at 20
literals, 3 new mock domains reset in `afterEach`, 4 e2e specs, and the Authors
module untouched and still green.

---

## 6. Outcome (batch closed)

All four gates green in one chain, run in the foreground by the orchestrator:

| Gate | Result |
|---|---|
| `pnpm typecheck` | ✅ exit 0 |
| `pnpm lint` | ✅ exit 0 |
| `pnpm test:run` | ✅ 14 files / 88 tests (was 3 / 16) |
| `pnpm test:e2e` | ✅ 29 passed (was 7) |
| `pnpm test:schematics` | ✅ 28 tests / 8 files |

End state matches the expectation above: 4 sidebar entries, 4 overview cards,
`MockRouteKey` at 20 literals, 3 new mock domains reset in the shared
`afterEach`, 4 e2e specs; Authors untouched and still green.

Deviations from the plan, and fixes applied during VERIFY:

- `e2e/categories.spec.ts` failed twice on Playwright strict mode
  (`getByText('FANTASY')` substring-matches the `Fantasy` heading and the
  title-case name cell). Fixed in place: `{ exact: true }` for the code cell and
  `getByRole('heading', …)` for the post-edit assertion.
- `mocks/domains/books.mock.ts` gained one export beyond its module —
  `bookExists(isbn)` — so the reviews domain can validate the relation
  server-side. Authorised at delegation time; nothing else in that file changed.
- Reviews' list ID column links to `/reviews/$reviewId` (the Book column already
  links to `/books/$isbn`), and `RatingStars` carries `role="img"` so the
  `4 of 5` label is exposed as an accessible name.

Carried forward to the next plan: the three **deferred** rows in § 3 (mock domain
factory + fixture → re-evaluate at batch 2, now that three more proven instances
exist; pages/forms → batch 3; section/e2e tests → still bespoke).
