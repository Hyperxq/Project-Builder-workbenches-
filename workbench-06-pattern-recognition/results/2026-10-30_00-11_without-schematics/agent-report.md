The Authors card on the Overview page now shows the author count below its description, for example `24 authors`. `pnpm typecheck`, `pnpm lint` and `pnpm test:run` all pass (30 tests). I didn't run the Playwright end-to-end tests (`pnpm test:e2e`). They open `/authors` directly, so the new card shouldn't affect them.

**What changed**
- **`src/features/authors/application/use-authors.ts`**: a new hook, `useAuthorsCount()`, asks the authors list endpoint for a one-row page and keeps only its `total`. Creating, editing or deleting an author already refreshes cached author lists, and that now includes this count.
- **`src/routes/index.tsx`**: the card shows `<n> authors` under the description once the count has loaded. While it loads, nothing is shown.

**Tests**: a new file, `src/features/authors/presentation/authors-overview-card.test.tsx`, checks three things:
1. The card shows `24 authors` from the sample data.
2. While the request is held open, the card shows its title but no number.
3. After an author is deleted on `/authors`, going back to `/` shows `23 authors`.

There's no test for the count going up after an author is created. That path refreshes the count the same way delete does.
