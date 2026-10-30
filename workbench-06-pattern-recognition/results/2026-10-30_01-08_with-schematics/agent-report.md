The Authors card on the Overview page now shows the author count, e.g. `24 authors`, below its description. While the count is loading, the card shows no number. `pnpm typecheck`, `pnpm lint` and `pnpm test:run` all pass (26 tests). I didn't run the Playwright tests (`pnpm test:e2e`), the fourth check AGENTS.md lists.

- **Count:** I added a `useAuthorsCount()` hook in `src/features/authors/application/use-authors.ts`. It asks the authors list endpoint for a single-row page and uses the `total` it returns. It uses the same cache keys as the authors list, so creating or deleting an author refreshes the card's count too.
- **Card:** `src/routes/index.tsx` shows the count as a line of small grey text under the description.
- **Tests:** the new `src/app/overview.test.tsx` has two tests. The first checks the card shows no number at first, then `24 authors`. The second deletes an author on `/authors` within the same app session, goes back to `/`, and checks the card now says `23 authors`.

The wording is always plural, so a single author reads `1 authors`. That matches the existing count on the Authors list page.

None of the installed schematics covered changing an existing card, so I wrote the change by hand.
