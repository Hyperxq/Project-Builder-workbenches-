# Batch 1 — Book [T1], Category [T1], Review [T2]

Orchestration plan per `HARNESS.md`. Authority on architecture: `AGENTS.md`.
Design language: `DESIGN.md` (already mapped to semantic tokens in
`src/index.css` — no new colors).

Baseline verified before planning: `pnpm typecheck`, `pnpm lint`,
`pnpm test:run` (16 tests / 3 files) and `pnpm test:e2e` (7 tests) all green
with `authors` as the only module.

---

## 1. Modules

### 1.1 Book (books) — [T1] vanilla, **string key** (`isbn`)

| Field | Type | Rules |
|---|---|---|
| `isbn` | string | required, unique, lookup key |
| `title` | string | required |
| `pages` | number | required, int, min 1 |
| `publishedAt` | date | optional (`YYYY-MM-DD`) |
| `inPrint` | boolean | required, default `true` |

Files:

```
mocks/fixtures/books.fixture.ts                  24 rows
mocks/domains/books.mock.ts                      bookHandlers() + resetBooks()
mocks/domains/books.mock.spec.ts
mocks/core/types.ts                              +5 route keys      (schematic)
mocks/handlers.ts                                +import +spread    (schematic)
mocks/setup-test-mocking.ts                      +resetBooks()      (schematic)
src/features/books/domain/book.ts                bookSchema, bookUpsertSchema, bookKey
src/features/books/infrastructure/books.api.ts                      (schematic)
src/features/books/application/use-books.ts                         (schematic)
  + useBookExists()                              hand-added, consumed by Review
src/features/books/presentation/books-page.tsx
src/features/books/presentation/book-form.tsx
src/features/books/presentation/book-create-page.tsx
src/features/books/presentation/book-edit-page.tsx
src/features/books/presentation/book-detail-page.tsx
src/features/books/presentation/in-print-badge.tsx
src/features/books/presentation/books-page.test.tsx
src/features/books/presentation/book-form.test.tsx
src/routes/books/index.tsx | new.tsx | $isbn/index.tsx | $isbn/edit.tsx   (schematic)
src/app/shell/app-sidebar.tsx                    +1 NAV line        (schematic)
src/routes/index.tsx                             +1 overview card   (schematic)
e2e/books.spec.ts
```

Decisions I own:

- `publishedAt` is `z.iso.date('Use YYYY-MM-DD')` (verified available in
  zod 4.4.3), stored and displayed verbatim as `YYYY-MM-DD`; `—` when absent.
  Form control is `<Input type="date">`; empty maps to `undefined` via
  `setValueAs` exactly like `country` on the Author form.
- `pages` uses `register(..., { valueAsNumber: true })` + `type="number"`,
  mirroring `authorId`.
- `isbn` is disabled on edit (the Author key-field rule).
- Mock `q` searches `isbn` + `title`.
- List columns: ISBN · Title · Pages · Published · Status · actions.

### 1.2 Category (categories) — [T1] vanilla, **string key** (`code`)

| Field | Type | Rules |
|---|---|---|
| `code` | string | required, unique, lookup key |
| `name` | string | required |
| `description` | string | optional |
| `enabled` | boolean | required, default `true` |

Same file drill as Book with `enabled-badge.tsx` in place of
`in-print-badge.tsx`. 22 fixture rows. Mock `q` searches `code` + `name` +
`description`. List columns: Code · Name · Description · Status · actions.
This is the closest-to-zero-deviation instance of the Author shape (single
unique field, one optional text field) — it is the control case that proves
the string-key variant.

### 1.3 Review (reviews) — [T2] quirks, **number key** (`reviewId`)

| Field | Type | Rules |
|---|---|---|
| `reviewId` | number | required, unique, lookup key |
| `bookIsbn` | string | required → RELATION to Book |
| `rating` | number | required, int, 1..5 |
| `comment` | string | optional |
| `verified` | boolean | required, default `false` |
| `reviewedAt` | date | required |

Extra files beyond the drill:

```
src/features/reviews/presentation/book-combobox.tsx    quirk (a)
src/features/reviews/presentation/rating-stars.tsx     quirk (b)
src/features/reviews/presentation/reviews-page.test.tsx   incl. quirks (b) and (c)
src/features/reviews/presentation/review-form.test.tsx    incl. quirk (a)
```

**Quirk (a) — RELATION.** `BookCombobox` is a Popover + `Command` composition
(both primitives already generated, currently unused). The trigger is a
button showing `title (isbn)` for the current value, or the raw typed value
when it resolves to nothing. `CommandInput` drives
`useBooksList({ q, pageSize: 8 })` from the **books application layer** —
allowed by the dependency rule (reviews/presentation → books/application is
inward and never touches another feature's presentation). A `CommandItem`
"Use ISBN <typed>" lets the user commit a free-typed value, which is what
makes the negative case reachable.

Existence validation is **async, at submit**, via a new books hook:

```ts
// src/features/books/application/use-books.ts
export function useBookExists() {
  const queryClient = useQueryClient()
  return useCallback(async (isbn: string) => { … fetchQuery(bookKeys.detail(isbn)) … }, [queryClient])
}
```

The review form awaits it before mutating and, on miss, calls
`setError('bookIsbn', …)` → a field error, no navigation, no toast. Chosen
over a synchronous "is it in the currently loaded options" check because that
races the query and would false-negative on a valid isbn typed quickly.
Defence in depth: the reviews mock also rejects an unknown `bookIsbn` with
400, asserted at the mock tier.

**Quirk (b) — ★ rating.** `RatingStars` renders
`<span aria-label="4 of 5"><span aria-hidden>★★★★☆</span></span>` — filled
stars in `text-foreground`, empty in `text-muted-foreground`. Used in the
list and on the detail page.

**Quirk (c) — Verified only.** `?verified=true` in the route's
`validateSearch`, absent when off (`z.boolean().optional().catch(undefined)`),
rendered as a `Switch` labelled "Verified only" in the toolbar, forwarded to
`GET /reviews?verified=true` and applied **by the mock endpoint**, not by the
client. Toggling resets to `page: 1`.

Mock `q` searches `bookIsbn` + `comment`. List columns: ID · Book · Rating ·
Reviewed · Verified · actions.

---

## 2. Pattern inventory (scout report, incorporated)

Scout's verdict, condensed. Repetition counts span Batch 1 **and** the
remaining schedule (14 unbuilt entities in total).

| # | Pattern | Status | Evidence | Repeats ahead | Deviations in Batch 1 |
|---|---|---|---|---|---|
| 1 | Mock domain drill (fixture + factory + spec + 3 registration edits) | **exists** | `mocks/core/types.ts`, `mocks/fixtures/authors.fixture.ts`, `mocks/domains/authors.mock.{ts,spec.ts}`, `mocks/handlers.ts`, `mocks/setup-test-mocking.ts` | 14 | Book/Category: `Map<string, T>`, no `Number()` cast. Review: `verified` query filter, `rating` range check, cross-store `bookIsbn` lookup |
| 2 | Feature four layers | **exists** | `src/features/authors/{domain,application,infrastructure,presentation}` | 14 | Book: first date field. Category: none. Review: combobox, stars, extra filter |
| 3 | Route files (4 thin files) | **exists** | `src/routes/authors/**` | 14 | Book/Category: string key ⇒ no `Number()` wrapper. Review: `verified` added to `validateSearch` |
| 4 | Registration edits (sidebar NAV + overview card) | **exists** | `src/app/shell/app-sidebar.tsx`, `src/routes/index.tsx` | 14 | none structural — label/icon/copy only |
| 5 | Test suites (mock-infra + section + e2e w/ axe) | **exists** | `mocks/domains/authors.mock.spec.ts`, `src/features/authors/presentation/*.test.tsx`, `e2e/authors.spec.ts` | 14 | Review adds combobox / star-label / URL round-trip assertions |
| 6 | String key vs number key | number-keyed **exists**, string-keyed **new** | `author.ts`, `$authorId/index.tsx`, `authors.mock.ts` | 7 string / 7 number | 5 mechanical differences: schema type, route `Number()` wrapper, `Map` key type, form input type/`valueAsNumber`, nothing else. Batch 1 proves the string variant (Book, Category) |
| 7a | Date field | **new** | — | 11 fields | Book `publishedAt` (optional), Review `reviewedAt` (required) |
| 7b | Extra URL-driven list filter | **new** | — | 5 entities (Review, Coupon, Payment, Ticket, Event) | Review `verified` is the first; `shared/api/pagination.ts` only knows `page`/`pageSize`/`q` today |
| 7c | Relation combobox | **new** | `command.tsx` + `popover.tsx` generated but unused | 2 (Review→Book, Invoice→Supplier) | Review is the first |
| 7d | Enum/Select, embedded objects, currency, derived columns, row switches, bulk selection, wizard, role gating | **new** | primitives exist (`select`, `field`, `checkbox`, `tabs`) but unwired | Batches 2–5 | out of Batch 1 scope |

Nothing is registered in Project Builder today: `project-builder.json` has
`"collections": {}` and `schematics/` holds only `.gitkeep`.

---

## 3. Schematic decisions

Per `plan-directives/schematics.md`. The directive states plainly that **the
Authors reference module counts** as the proven, gates-green instance — so
rule 1 (extract before building the repeats) fires for every pattern Authors
already proves that repeats ≥3 times ahead. Crystallization is bottom-up: the
always-done registration/wiring edits first, then the two field-independent
file scaffolds. Anything whose content is driven by the entity's field list is
deferred — a schematic that templated arbitrary fields would be exactly the
master generator the directive forbids.

| Pattern | Established? | Action | Rationale (proven instance · repetitions · variation points) |
|---|---|---|---|
| Mock-domain registration — 5 route keys in `mocks/core/types.ts`, import+spread in `mocks/handlers.ts`, import + `reset<Plural>()` in `mocks/setup-test-mocking.ts` | yes | **extract** → `default:mock-domain-register` | Authors proves all three edits; repeats 14× (3 this batch). Variation points: `plural`, `singular`. Idempotent: re-running must not duplicate a key, an import or a spread |
| Sidebar NAV entry — one `NavEntry` + its lucide import in `src/app/shell/app-sidebar.tsx` | yes | **extract** → `default:sidebar-nav-entry` | Authors proves it; repeats 14×. Variation points: `path`, `label`, `icon`. Kept separate from the overview card: different file, different shape, independently useful |
| Overview card — one `<Link><Card>…` block in `src/routes/index.tsx` | yes | **extract** → `default:overview-card` | Authors proves it; repeats 14×. Variation points: `path`, `title`, `description`, `icon` |
| CRUD route files — `index.tsx` (`validateSearch`), `new.tsx`, `$key/index.tsx`, `$key/edit.tsx` | yes | **extract** → `default:crud-routes` | Authors proves all four; repeats 14× (56 files). Variation points: `plural`, `singular`, `keyName`, `keyType` (`string` \| `number`, which decides the `Number()` wrapper), `extraSearch` (raw zod fragment for entities with filters beyond `page`/`q`) |
| Entity data layer — `infrastructure/<plural>.api.ts` + `application/use-<plural>.ts` | yes | **extract** → `default:entity-data-layer` | Both files are 100% field-independent in the Authors reference: only plural/singular/key vary. Repeats 14× (28 files). Variation points: `plural`, `singular`, `keyName`, `keyType`, `listParamsType`. Treated as ONE atomic pattern — the api object and the hooks that wrap it are never generated apart |
| Domain schema (`domain/<singular>.ts`) | shape yes, content no | **defer** | Content is the entity's field list; no proven instance yet for date / enum / embedded / relation fields. Batch 1 proves date + relation only. Re-evaluate at the Batch 3 plan, once the field-type matrix has instances |
| Fixture + mock handler factory | shape yes, content no | **defer** | Same reason: per-field validation, `q`-search field set, and per-entity filters are the content. The *registration* half is extracted above |
| List page / form / create / edit / detail pages | shape yes, content no | **defer** | Columns, form controls and detail rows are all field-driven; T2/T3 quirks (row actions, bulk bars, wizards) diverge further each batch. Declared the rule below rather than generated |
| Relation combobox, star rating, URL filter beyond `page`/`q` | **new** | **none** (build by hand) | Rule 2: no proven instance exists. The combobox repeats once more (Invoice→Supplier, Batch 3) and the extra-filter shape 4 more times — both become extraction candidates at the Batch 2/3 plan **once Review is green** |

**Rules declared now, extractable later** (rule 2): the T1 module shape as
built in this batch — string-keyed and number-keyed variants of the domain
schema, fixture, mock factory, list page, form, create/edit/detail pages — is
the shape the remaining schedule repeats. Book and Category are built by hand
to that rule; the moment Batch 1's gates are green they are the proven
instances a later plan extracts from.

**Supporting change I own** (not a schematic): `src/shared/api/pagination.ts`
`toQueryString` is extended to serialise entity-specific list params beyond
`page`/`pageSize`/`q` (skipping `undefined`/`''`), so `ListParams` stays the
one place query strings are built. Required by Review's `verified` and by
four more entities in Batches 2–4. `ListParams` itself is unchanged, so
Authors is untouched; per-entity params are declared as **type aliases**
(`type ReviewListParams = ListParams & { verified?: boolean }`).

Schematic hygiene: `bun test schematics/` wired as `pnpm test:schematics`;
files named `*.test.ts` under `schematics/` so vitest (which only includes
`src/**` and `mocks/**`) ignores them. `builder execute` is run standalone,
one per shell call, by me — never inside a mechanic delegation — because all
five write to files shared across modules.

---

## 4. Delegation plan

I scaffold (`builder new schematic`) and run (`builder execute`) everything
that touches shared files myself; mechanics only ever own disjoint file sets.

| Unit | Owner | Scope | Depends on |
|---|---|---|---|
| **U0** | me | `pnpm` script `test:schematics`; `builder new schematic` × 5; extend `toQueryString` | — |
| **U1** | mechanic A | Author the three registration schematics: `mock-domain-register`, `sidebar-nav-entry`, `overview-card` — `schema.json`, `factory.ts`, `*.test.ts`, description filled in. Idempotency asserted in tests | U0 |
| **U2** | mechanic B | Author the two scaffold schematics: `crud-routes`, `entity-data-layer` — same deliverables | U0 |
| **U3** | me | Review U1/U2 against this plan; `builder execute` all five for `books` and `categories`; verify written files match the Authors reference byte-for-shape | U1, U2 |
| **U4** | mechanic C | **Book module**: fixture, mock factory + spec, domain schema, presentation (5 pages + badge), section tests, `e2e/books.spec.ts`, plus `useBookExists()` appended to the generated `use-books.ts` | U3 |
| **U5** | mechanic D | **Category module**: fixture, mock factory + spec, domain schema, presentation (5 pages + badge), section tests, `e2e/categories.spec.ts` | U3 |
| **U6** | me | Gates after wave 1; fix; then `builder execute` all five for `reviews` | U4, U5 |
| **U7** | mechanic E | **Review module**: fixture, mock factory + spec (incl. `verified` filter, rating range, `bookIsbn` referential check), domain schema, `BookCombobox`, `RatingStars`, presentation, section tests, `e2e/reviews.spec.ts` | U6 |
| **U8** | me | Full four-gate run, diagnosis, fixes | U7 |

U4 and U5 run **in parallel** — their file sets are disjoint (`books` vs
`categories` under `mocks/` , `src/features/`, `e2e/`) and every shared file
they need was already written in U3. U7 runs after wave 1 because the relation
target (Book + `useBookExists`) must exist and be green first.

Every delegation prompt carries: the exact file list, the reference file to
mirror (always the Authors counterpart), the entity's spec lines from
`entities-benchmark.txt`, and the tests required. Mechanics make no design
decisions — the ones above are all mine and are restated in each prompt.

---

## 5. Verification plan

Per module, before I call it done:

1. **Mock tier** — `mocks/domains/<plural>.mock.spec.ts` covers: default page
   size 10 and total = fixture length; last page holds the remainder; `q`
   filters across the declared string fields; `GET` 200 + 404; `POST` 201 with
   the boolean default applied, 400 invalid, 409 duplicate key; `PATCH`
   partial merge; `DELETE` 204 then 404; state reseeds between tests.
   Review additionally: `?verified=true` filters, rating outside 1..5 → 400,
   unknown `bookIsbn` → 400.
2. **Section tier** — list: renders page 1 from the API, searches, paginates,
   deletes through the row menu with confirmation. Form: validation errors on
   empty submit without navigating, successful create returning to the list,
   server 409 surfaced in the form. Review additionally: ★ label
   (`4 of 5`) asserted by accessible name, "Verified only" writes
   `?verified=true` to the URL and narrows the list, combobox selects a book
   from the async list, and a free-typed unknown isbn fails validation
   in-form.
3. **E2E tier** — `e2e/<plural>.spec.ts`: list + pagination, search, create,
   detail + edit, delete with confirmation, duplicate-key server error, and an
   axe scan of the list and form pages asserting zero serious/critical
   violations. Review adds an e2e pass over the verified toggle and the
   combobox.
4. **Schematics** — `pnpm test:schematics` green, each factory asserted
   idempotent (a second run against the seeded tree writes nothing new).
5. **Batch gates** — `pnpm typecheck && pnpm lint && pnpm test:run &&
   pnpm test:e2e`, run by me, all four green. The Authors module's existing
   16 unit tests and 7 e2e tests must still pass unchanged.

---

## 6. Outcome

All four gates green (chained, exit 0): **73 unit/section tests across 12
files**, **29 e2e tests** including an axe scan per module, plus **20
schematic tests** (`pnpm test:schematics`). Authors' original 16 unit and 7
e2e tests still pass untouched.

Delivered: Book [T1], Category [T1], Review [T2] with all three quirks —
the async books combobox with async existence validation on a free-typed
isbn, ★ rating with an accessible label, and the URL-driven "Verified only"
filter applied by the list endpoint.

Five schematics extracted and used 15 times (3 entities × 5), each run
standalone: `mock-domain-register`, `sidebar-nav-entry`, `overview-card`,
`crud-routes`, `entity-data-layer`. Both declared variation points fired on
Review: `extraSearch` injected `verified` into the route's search contract,
and `listParamsType` threaded `ReviewListParams` through the data layer
while correctly dropping the now-unused `ListParams` import.

Defects found in review and fixed:

- The three registration schematics' tests seeded from the LIVE target files
  but used `books` as their fixture entity — correct output, but they would
  have started failing the moment `books` was really registered (the factory
  rightly skips). Retargeted to a never-scheduled fixture entity (`widgets` /
  `Boxes`) and made the import-clause assertions structural (sorted, no
  duplicates) rather than exact name sets, so they survive every future
  registration.
- `entity-data-layer` emitted two separate type imports from the same domain
  module in the custom-list-params case; merged.
- Review's form left `bookIsbn` undefined by default, so an untouched
  combobox surfaced Zod's generic expected-string-received-undefined text
  instead of "Book is required". Defaulted to `''`.
- Two e2e assertion bugs in `e2e/reviews.spec.ts`: a non-exact accessible
  name (`Actions for review 1` also matches `…review 10`) and a delete-toast
  string that did not match the list page's `Review #<id> deleted`.

### Carried into the Batch 2 plan

These shapes are now PROVEN (gates-green) and become extraction candidates
per rule 1 of the schematics directive, having been deferred here for want of
a proven instance:

| Shape | Proven by | Repeats left | Note for extraction |
|---|---|---|---|
| String-keyed T1 module (domain + fixture + mock factory + list/form/create/edit/detail) | Book, Category | 5 (Vehicle, Coupon, Warehouse, Shipment, Event) | Two independent instances now agree; the field list is the only variation |
| Number-keyed T1 module | Author, Review | 5 (Supplier, Invoice, Payment, Ticket, Subscription, Employee) | Differs from the string variant in exactly the 5 points in §2 row 6 |
| Extra URL-driven list filter (search schema + params type + endpoint filter + toolbar control) | Review `verified` | 4 (Coupon `status`, Payment `method`, Ticket `from`/`to`, Event `status`) | `toQueryString` already generalised; Ticket needs a two-param range |
| Relation combobox | Review → Book | 1 (Invoice → Supplier) | Only one repeat left — extend rather than extract, or leave by hand |
| Status badge component (`active`/`in-print`/`enabled`/`verified`) | 4 instances | ~8 | Four near-identical copies now exist; a shared primitive is the better move than a schematic |
