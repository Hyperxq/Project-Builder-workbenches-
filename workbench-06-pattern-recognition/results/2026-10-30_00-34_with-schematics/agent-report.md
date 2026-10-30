The Authors card on the Overview page now shows the author count, e.g. `24 authors`, below its description. It shows no number while the count loads. `pnpm typecheck`, `pnpm lint` and `pnpm test:run` all pass (26 tests). I didn't run `pnpm test:e2e`, which AGENTS.md also lists as a gate.

**How it works** (`src/routes/index.tsx`): a small `AuthorsCount` component asks the authors list endpoint for a single row (`pageSize: 1`) and displays the `total` it returns. Creating or deleting an author already tells the app to refetch authors lists, so the count updates by itself.

**Tests** (`src/app/overview-page.test.tsx`), run against the real app and mock API:
- With the seeded data, the card shows no count at first, then `24 authors`.
- After deleting an author on `/authors` and returning to the Overview, the card shows `23 authors`.

The test run prints "Not implemented: Window's scrollTo()" warnings. They come from the test environment (jsdom), most likely when the delete test moves between pages, and don't affect the results.

None of the Project Builder schematics fit this change, since the card already existed. Adding the count doesn't stop the `overview-card` schematic from adding more cards later.
