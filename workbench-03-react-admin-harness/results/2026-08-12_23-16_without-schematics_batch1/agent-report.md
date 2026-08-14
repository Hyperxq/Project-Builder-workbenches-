Batch 1 is complete and verified.

## What shipped

**Book [T1]**, **Category [T1]**, **Review [T2]** — each a full module across all four layers, with mock domain (24-row fixture, handler factory, mock-infra spec), routes (list `?page&q`, new, `$key`, `$key/edit`), sidebar entry, overview card, section tests, and an e2e spec with an axe scan.

All three Review quirks are implemented and tested:
- **(a) Relation** — `bookIsbn` via an async combobox over `GET /books?q=` showing `"title (isbn)"`. Free-typing is deliberately allowed (`Use "…"` item) so an unknown ISBN fails validation as a **field error** on `bookIsbn` — checked client-side (`booksApi.get` → 404) and again server-side in the mock via a new cross-domain `bookExists()` lookup.
- **(b) Rating** — `★★★★☆` with accessible name `"4 of 5"` (`role="img"`), never the glyphs.
- **(c) Verified only** — a Switch wired to `?verified=true`, forwarded to the list endpoint and preserved across search and pagination.

## Protocol

Phase 1 produced `plans/batch-1.md` (modules, scout pattern inventory, delegation plan, verification plan) before any source file was touched; no `plan-directives/` existed. Phase 2 ran as Wave 0 (my shared groundwork) → Book → Category → Review, each delegated to `mechanic` with exact files, mirror references, spec lines and required tests, and each reviewed before the next.

Two things worth flagging:
- **I deviated from my own §4**: Category and Review ran sequentially, not in parallel. Both had to edit the same five shared registration files and both self-verify with whole-project gates, so concurrency would have raced on the edit anchors and polluted each mechanic's signal. Cost was wall-clock only; recorded in the plan.
- **One fix I made after the Review delivery**: cmdk's `Command` renders its own sr-only label and wires it via `aria-labelledby`, which silently overrode the `aria-label` on the search input, leaving it with no accessible name. Fixed in the shared `RelationCombobox` by passing `label={searchLabel}` to `Command`.

Two decisions I made that outlive this batch: `toQueryString` gained one additive optional `extra` argument for per-entity filters (Coupon/Payment/Ticket/Event reuse it), and `RelationCombobox` lives in `src/shared/components/` as a presentational component the owning feature feeds — Invoice→Supplier in batch 3 is its second user.

## Phase 3 — gates, run by me in the foreground

| Gate | Result |
|---|---|
| `pnpm typecheck` | pass |
| `pnpm lint` | pass |
| `pnpm test:run` | 12 files / 76 tests passed |
| `pnpm test:e2e` | 29 tests passed (authors 7, books 7, categories 7, reviews 8) |

The pre-existing Author module is untouched and still green.
