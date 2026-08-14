# Batch 1 — Book [T1], Category [T1], Review [T2]

Orchestrator plan per `HARNESS.md`. Authority on architecture/patterns is
`AGENTS.md`; design language is `DESIGN.md`. Reference module: **Author**
(`src/features/authors/**`, `mocks/domains/authors.mock.ts`, `src/routes/authors/**`,
`e2e/authors.spec.ts`).

Baseline confirmed green before any change: `pnpm typecheck`, `pnpm lint`,
`pnpm test:run` (16 tests / 3 files), `pnpm test:e2e` (7 tests).

`plan-directives/` does not exist — no external directives to incorporate.

---

## 1. Modules

### 1.1 Book — Tier T1

Fields: `isbn: string, required, unique` · `title: string, required` ·
`pages: number, required, min 1` · `publishedAt: date, optional` ·
`inPrint: boolean, required, default true`.

Files (per the AGENTS.md module drill):

| File | Mirrors |
|---|---|
| `mocks/core/types.ts` (+5 route keys `LIST_BOOKS`…`DELETE_BOOK`) | existing union |
| `mocks/fixtures/books.fixture.ts` (24 rows) | `authors.fixture.ts` |
| `mocks/domains/books.mock.ts` (+ `resetBooks`, + `bookExists`) | `authors.mock.ts` |
| `mocks/domains/books.mock.spec.ts` | `authors.mock.spec.ts` |
| `mocks/handlers.ts` (import + spread) | existing |
| `mocks/setup-test-mocking.ts` (`resetBooks()` in `afterEach`) | existing |
| `src/features/books/domain/book.ts` | `domain/author.ts` |
| `src/features/books/infrastructure/books.api.ts` | `infrastructure/authors.api.ts` |
| `src/features/books/application/use-books.ts` | `application/use-authors.ts` |
| `src/features/books/presentation/books-page.tsx` | `authors-page.tsx` |
| `src/features/books/presentation/book-form.tsx` | `author-form.tsx` |
| `src/features/books/presentation/book-create-page.tsx` | `author-create-page.tsx` |
| `src/features/books/presentation/book-edit-page.tsx` | `author-edit-page.tsx` |
| `src/features/books/presentation/book-detail-page.tsx` | `author-detail-page.tsx` |
| `src/features/books/presentation/in-print-badge.tsx` | `active-badge.tsx` |
| `src/features/books/presentation/books-page.test.tsx` | `authors-page.test.tsx` |
| `src/features/books/presentation/book-form.test.tsx` | `author-form.test.tsx` |
| `src/routes/books/{index,new}.tsx`, `src/routes/books/$isbn/{index,edit}.tsx` | `src/routes/authors/**` |
| `src/app/shell/app-sidebar.tsx` (one NAV line) · `src/routes/index.tsx` (card) | existing |
| `e2e/books.spec.ts` | `e2e/authors.spec.ts` |

### 1.2 Category — Tier T1

Fields: `code: string, required, unique` · `name: string, required` ·
`description: string, optional` · `enabled: boolean, required, default true`.

Same file list with `categories`/`category`, key param `$code`, badge
`enabled-badge.tsx`. No new shapes at all (see §2).

### 1.3 Review — Tier T2

Fields: `reviewId: number, required, unique` · `bookIsbn: string, required` (RELATION) ·
`rating: number, required, 1..5` · `comment: string, optional` ·
`verified: boolean, required, default false` · `reviewedAt: date, required`.

Same file list with `reviews`/`review`, key param `$reviewId` (numeric — route
component casts with `Number(...)` exactly like `$authorId`), **plus**:

- `src/features/reviews/presentation/rating-stars.tsx` (quirk b, entity-local)
- `src/features/reviews/presentation/verified-filter.tsx` may be inlined in the
  list page (quirk c)
- shared `src/shared/components/relation-combobox.tsx` (quirk a — see §2.B)

---

## 2. Pattern inventory (scout report, incorporated)

Scout ran read-only over `AGENTS.md`, `DESIGN.md`, the whole Author module, the
mock core, the shadcn inventory and the configs. Verbatim findings, condensed
per module, with the orchestrator's decisions marked **DECISION**.

### Book — EXISTS (~70 % pure mirror of Author)

CRUD wiring (query-key factory, mutations + invalidation, thin route files,
list search/paginate/delete UI, AlertDialog confirm, sonner toasts,
server-conflict surfacing) copies directly. `inPrint` is a byte-for-byte copy of
`active`. Deviations the Author pattern does not cover:

1. **String unique key** (`isbn`, not numeric `authorId`): no `valueAsNumber` on
   the key input; route params stay strings — no `Number(params.…)` cast
   (contrast `src/routes/authors/$authorId/index.tsx:9`).
2. **Number with min** (`pages`, min 1): first of its kind. `z.number().int().min(1, …)`
   + `register('pages', { valueAsNumber: true })`.
3. **Date field** (`publishedAt`, optional): entirely new — no date exists in the
   tree. Native `<input type="date">`, `YYYY-MM-DD` in lists.

### Category — EXISTS (~95 % pure mirror, zero new shapes)

`code`/`name`/`description`/`enabled` map 1:1 onto
`authorId`/`fullName`/`country`/`active`; only the key is a string instead of a
number. Purest repetition in the batch — no design decisions required.

### Review — NEW (base CRUD mirrors Author; three quirks have no precedent)

- `rating` is the first two-sided numeric range (`min(1).max(5)`).
- `verified` is the first boolean defaulting **false** — the reference's
  `checked={field.value ?? true}` (`author-form.tsx:107`) must become `?? false`,
  and the mock's `?? true` must become `?? false`. Explicit counter-example.
- `reviewedAt` is the first **required** date (Book's is optional) — no
  empty-string mapping, a required-message instead.
- Quirk (a) relation: no combobox/relation pattern exists anywhere. Building
  blocks do: `src/components/ui/command.tsx` (cmdk) + `popover.tsx` (Radix).
  The books search needs **nothing new** on the wire — the standard
  `GET /books?q=` contract covers it provided Book's `q` filter searches `title`
  **and** `isbn` (a user may free-type an ISBN).
- Quirk (b) ★ rating: confirmed **one-off** across all 15 entities → entity-local.
- Quirk (c) `?verified=true`: first search param beyond `page`/`q`.

### Look-ahead over the remaining schedule (batches 2–5)

| New shape in batch 1 | Reused later | **DECISION** |
|---|---|---|
| Date fields | 9 of 11 remaining entities (Coupon, Invoice, Shipment, Payment, Ticket, Event, Subscription, Employee…) | Not a component — lock the **idiom**: `z.iso.date(msg)` (verified available in zod 4.4), native `<input type="date">`, optional dates use the `setValueAs` `'' → undefined` mapping from `author-form.tsx:90-93`. |
| Number min / range | 8+ later instances (Vehicle.year, Coupon.discount, Invoice.total, …) | Zod-constraint idiom only, no abstraction. |
| URL-driven list filter beyond page/q | Coupon `?status`, Payment `?method`, Ticket `?from&to`, Event `?status` | No generic filter abstraction (shapes differ: boolean / enum / range). Lock the **three-point idiom**: route `validateSearch` → feature-local `ListParams` extension → mock query parser + extra `.filter()`. Shared `toQueryString` gets ONE additive optional `extra` argument so every downstream feature stops re-deriving `?`/`&` juggling. |
| Async relation combobox | Invoice → Supplier (batch 3); only other RELATION in the spec | Build once as a **shared primitive** at `src/shared/components/relation-combobox.tsx` (not `components/ui/`, which is generated and must not be hand-edited; `src/shared/` is the established home for cross-feature code). |
| Cross-domain mock validation | Invoice → Supplier needs `supplierExists` the same way | Lock the idiom: each domain mock exports a `<entity>Exists(key)` lookup; the referencing domain imports it. `books.mock.ts` exports `bookExists(isbn)`. |
| ★ rating render | never again | Entity-local `rating-stars.tsx`. |

### Cross-feature import rule (**DECISION**, new precedent)

Author has no relations, so `AGENTS.md` does not cover feature→feature imports.
The rule for this batch and everything downstream: **a feature may import
another feature's `domain` / `infrastructure` / `application` exports; never its
`presentation`.** Concretely, `features/reviews/presentation` imports
`useBooksList` and `booksApi` from `features/books`. This keeps the existing
inward-only dependency rule intact (nothing imports presentation).

### Mechanical facts (from scout; binding for all delegations)

- Search params: Zod object in the route's `validateSearch`
  (`src/routes/authors/index.tsx:9-12`, `.default().catch()` on every field);
  read via `getRouteApi('/<plural>/').useSearch()` (`authors-page.tsx:36,41`).
- Mock query parsing: per-domain `parsePage(url)` (`authors.mock.ts:39-45`)
  clamps `page ≥ 1`, `pageSize` 1–100, lowercases `q`; extra filters chain after
  the `q` filter (`authors.mock.ts:69-76`).
- `PAGE_SIZE = 10` in the page component must match the mock default; fixtures
  need ≥ 20 rows (Author has 24 → 3 pages).
- `src/routeTree.gen.ts` is **auto-generated** by the `tanstackRouter` Vite
  plugin (`vite.config.ts:16`) and gitignored — never hand-edit; it regenerates
  on `pnpm typecheck` / `pnpm dev:mock`, and `src/test/render-app.tsx:4` imports
  it, so typecheck must run before tests when routes change.
- MSW reset: every domain adds `reset<Plural>()` to the `afterEach` in
  `mocks/setup-test-mocking.ts:33-36` and a spread in `mocks/handlers.ts:25`.
- Tests target roles/labels only: `searchbox`/`button`/`link`/`menuitem`/
  `alertdialog`/`getByLabelText`/`role="alert"` paragraphs for field errors.
- `vite.config.ts` `test.env.VITE_API_BASE` is absolute and must stay so;
  all infra goes through `shared/api/client.ts`.
- `.oxlintrc.json` disables `react/only-export-components` for `src/routes/**`,
  so the two-export route pattern is pre-cleared.
- jsdom stubs for `scrollIntoView` / pointer capture / `ResizeObserver` /
  `matchMedia` already exist in `src/test/setup.ts:7-28` — Radix Popover + cmdk
  are therefore safe to use in section tests (verified present, no change needed).
- The list footer is a hand-rolled Previous/Next pair (`authors-page.tsx:196-213`),
  **not** the unused `components/ui/pagination.tsx`. Mirror the hand-rolled one
  so the tested contract stays uniform.

---

## 3. Orchestrator design decisions (mechanics implement, never decide)

1. **Date storage/display** — dates are stored and transported as `YYYY-MM-DD`
   strings; schema `z.iso.date('Must be a valid date')`; list/detail render the
   raw string (or `—` when absent). Optional date inputs map `'' → undefined`.
2. **`toQueryString` gains one additive optional argument**
   `extra?: Record<string, string | undefined>`; entries that are `undefined` or
   `''` are skipped. No call-site churn; used by Review's `verified` today and by
   four later entities. Owned by the orchestrator (shared file).
3. **`RelationCombobox`** (`src/shared/components/relation-combobox.tsx`) is a
   *presentational* component — it receives `options`, `query`, `onQueryChange`,
   `isLoading`; it never fetches. The feature supplies data through the related
   feature's application hook (`useBooksList`). Built on Popover + Command with
   `shouldFilter={false}` (server-side search). Owned by the orchestrator.
   - Free-typing: when the query matches no option, the list offers
     `Use "<query>"`, which sets the raw value — so an unknown ISBN can be
     submitted and must then FAIL validation (quirk a).
4. **Unknown-relation validation happens on both sides**:
   - client: the review form's submit handler resolves the ISBN via
     `booksApi.get(isbn)`; a 404 becomes a **field error** on `bookIsbn`
     (`setError('bookIsbn', { message: 'No book with ISBN “X”' })`) and the
     submit is aborted — no toast, matching the spec's "fail validation".
   - server: `reviews.mock.ts` validates `bookIsbn` against the books store via
     `bookExists()` and returns 400 `bookIsbn <x> does not exist`.
5. **Sort order** (deterministic pagination): books by `isbn`, categories by
   `code` (both `localeCompare`), reviews by `reviewId` ascending.
6. **`q` coverage per domain**: books → `isbn`, `title`; categories → `code`,
   `name`, `description`; reviews → `bookIsbn`, `comment`.
7. **List columns**
   - Books: ISBN · Title (link to detail) · Pages · Published · In print (badge) · actions
   - Categories: Code · Name (link) · Description · Status (badge) · actions
   - Reviews: Review `#<id>` (link) · Book (isbn) · Rating (★) · Reviewed · Verified (badge) · actions
8. **Rating stars**: `<span role="img" aria-label="4 of 5">★★★★☆</span>` — five
   glyphs always, filled first. Accessible name is the label, never the glyphs.
9. **Verified toggle**: shadcn `Switch` + `Label` "Verified only" in the toolbar;
   route search `verified: z.boolean().default(false).catch(false)`; forwarded to
   the endpoint only when `true`.
10. **Pinned Book fixture rows** (Review's fixture and tests reference these, so
    they are contract, not decoration; the remaining 18 rows are the mechanic's
    choice, all ISBNs unique, ≥ 24 rows total):
    | isbn | title |
    |---|---|
    | `978-0-06-088328-7` | `One Hundred Years of Solitude` |
    | `978-0-14-243724-7` | `The Left Hand of Darkness` |
    | `978-0-307-38789-9` | `Kafka on the Shore` |
    | `978-0-571-25808-4` | `Never Let Me Go` |
    | `978-0-8112-0004-2` | `Labyrinths` |
    | `978-1-4000-3341-6` | `Beloved` |
11. **Sidebar/overview**: Books (`BookOpen`), Categories (`Tags`), Reviews (`Star`).
12. Every entity keeps `PAGE_SIZE = 10`, 24 fixture rows → "Page 1 of 3".

---

## 4. Delegation plan

Shared files (`mocks/core/types.ts`, `mocks/handlers.ts`,
`mocks/setup-test-mocking.ts`, `src/app/shell/app-sidebar.tsx`,
`src/routes/index.tsx`) are touched by every module, so delegations are
sequenced to avoid concurrent edits to them; each unit owns its own additions.

| Wave | Unit | Agent | Depends on |
|---|---|---|---|
| 0 | Shared groundwork: `toQueryString(extra)` + `src/shared/components/relation-combobox.tsx` | orchestrator (design work) | — |
| 1 | **Book** module, complete drill + wiring + tests + e2e | `mechanic` | wave 0 |
| 2 | **Category** module, complete drill + wiring + tests + e2e | `mechanic` | wave 1 (shared-file serialization) |
| 2 | **Review** module, complete drill + 3 quirks + tests + e2e | `mechanic` | wave 1 (books api + `bookExists`) |

Waves 2's two delegations are launched **together in one message** (blocking,
foreground) since their module files are disjoint; each is given distinct,
explicit anchors for the shared-file edits, is told a sibling module is landing
concurrently, and is told to ignore failures naming files outside its own module
and to **not** run `pnpm test:e2e` (single dev server on port 3010 — the
orchestrator runs it).

Every delegation prompt carries: the exact file list, the reference file to
mirror per file, the entity's spec lines from `entities-benchmark.txt`, the
decisions from §3 that apply, and the tests it must include.

The orchestrator reviews each delivery against this plan before moving on.

---

## 5. Verification plan

Per module, before it is considered delivered:

1. **Mock-infra spec** (`mocks/domains/<plural>.mock.spec.ts`): default page size
   10 + total 24; page 3 holds the remaining 4; `q` filters across the documented
   fields; `GET` 200 / 404; `POST` 201 with the boolean default applied
   (`inPrint`/`enabled` → true, `verified` → false); 400 on invalid; 409 on
   duplicate unique key (and on any second unique field); `PATCH` partial merge;
   `DELETE` 204 then 404; state reseeds between tests.
   - Review additionally: 400 when `bookIsbn` does not exist; `?verified=true`
     narrows the list.
2. **Section tests** (`src/features/<plural>/presentation/*.test.tsx`):
   list renders page 1 from the API, search filters, Next paginates to
   "Page 2 of 3", row-menu delete with confirmation removes the row;
   form shows validation errors on empty submit without navigating, creates and
   returns to the list, surfaces the server conflict on a duplicate unique value.
   - Book: `pages` min-1 error; optional `publishedAt` may be left empty.
   - Review quirks: (a) pick a book through the combobox and create; free-type an
     unknown ISBN → field error on `bookIsbn`, no navigation; (b) `★★★★☆` cell
     exposes the accessible name "4 of 5"; (c) toggling "Verified only" puts
     `verified=true` in the URL and narrows the rows.
3. **E2E** (`e2e/<plural>.spec.ts`): list + pagination, search, create, detail +
   edit, delete with confirmation, duplicate-key server error, and an axe scan of
   the list and form pages asserting zero serious/critical violations.
   - Review e2e also exercises the combobox and the Verified-only toggle.
4. **Gates** — the orchestrator runs, in the foreground, until all four are green:
   `pnpm typecheck && pnpm lint && pnpm test:run && pnpm test:e2e`.
   Expected final counts: 4 mock specs, 6 section-test files, 4 e2e specs.

---

## 6. Execution record

Waves ran: 0 (orchestrator: `toQueryString(extra)`, `RelationCombobox`) → 1 (Book,
`mechanic`) → 2a (Category, `mechanic`) → 2b (Review, `mechanic`). Each delivery
was reviewed against §1–§3 before the next started.

**Deviation from §4**: Category and Review were run sequentially rather than in
one parallel message. Both units must edit the same five shared files
(`mocks/core/types.ts`, `handlers.ts`, `setup-test-mocking.ts`, `app-sidebar.tsx`,
`routes/index.tsx`), and both self-verify with whole-project gates — concurrent
edits would have raced on the anchors and given each mechanic an unreadable gate
signal from the sibling's half-written module. Serialising cost wall-clock only.

**Orchestrator fix after Review's delivery**: cmdk's `Command` renders its own
sr-only `<label>` and wires it to the input with `aria-labelledby`, which
overrides an `aria-label` on `CommandInput` — the search field was left without
an accessible name. Fixed in the shared component by passing
`label={searchLabel}` to `Command` (the supported cmdk prop) instead of
`aria-label` on the input. Tests target the field by placeholder and were
unaffected.

**Final gate run (orchestrator, foreground)** — all four green:

| Gate | Result |
|---|---|
| `pnpm typecheck` | pass |
| `pnpm lint` | pass (oxlint, no findings) |
| `pnpm test:run` | 12 files / 76 tests passed |
| `pnpm test:e2e` | 29 tests passed (authors 7, books 7, categories 7, reviews 8) |

Delivered: 4 mock specs, 6 section-test files, 4 e2e specs — Batch 1 is done.
Shapes established here for later batches: the date-field idiom, the
number-min/range idiom, the three-point URL-filter idiom, the shared
`RelationCombobox`, the `<entity>Exists()` cross-domain mock lookup, and the
cross-feature import rule (§2).
