Batch 1 is delivered and every gate is green.

**Phase 1 — PLAN.** `plans/batch-1.md` covers modules, the `scout` pattern inventory (incorporated verbatim), delegation plan, verification plan, and — per `plan-directives/schematics.md` — a `## Schematic decisions` table with one row per pattern.

**Phase 2 — BUILD.** Eight Project Builder schematics were extracted from the proven Authors module before the repeats were built, bottom-up:

- Wiring (atomic edits, idempotent): `mock-route-keys`, `mock-domain-register`, `sidebar-nav-entry`, `overview-card`
- Skeleton generators: `crud-api`, `crud-hooks`, `crud-routes` (one variation point, `extraSearch`)
- Composite `crud-module`, authored only after the seven were unit-tested *and* executed for real on Book; it imports their `helper.ts` exports rather than re-implementing any edit

Book was scaffolded with the seven atomics, Category and Review with the composite. Three shapes were deliberately **deferred** with rationale (mock domain factory, pages/forms, tests) rather than crystallised into the master generator the directive forbids.

Three modules landed via `mechanic` delegations: Book [T1], Category [T1], Review [T2] — with all three T2 quirks: the async books-endpoint combobox (unknown ISBN fails as a field error via an async `superRefine`, and the mock independently 400s), ★ ratings with a `4 of 5` accessible name, and a URL-driven "Verified only" toggle applied by the list endpoint.

**Phase 3 — VERIFY.** One real failure surfaced: two Playwright strict-mode locators in `e2e/categories.spec.ts` (`getByText('FANTASY')` substring-matches the `Fantasy` heading). Fixed and re-run.

| Gate | Before | After |
|---|---|---|
| `pnpm typecheck` | ✅ | ✅ |
| `pnpm lint` | ✅ | ✅ |
| `pnpm test:run` | 3 files / 16 tests | 14 files / 88 tests |
| `pnpm test:e2e` | 7 passed | 29 passed |
| `pnpm test:schematics` | — | 28 tests / 8 files |

One scope note: `mocks/domains/books.mock.ts` gained a single extra export, `bookExists(isbn)`, so Reviews could validate the relation server-side — I authorised that at delegation time; nothing else in Books changed, and Authors is untouched.
