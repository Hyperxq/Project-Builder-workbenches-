The Authors card on the Overview page now shows the total as `<n> authors` (e.g. `24 authors`) below its description. Until the count has loaded, the card shows no number. `pnpm typecheck`, `pnpm lint` and `pnpm test:run` all pass (32 tests). I didn't run the e2e suite, and there is no e2e test for the count.

**How it works**
- I added a `useAuthorsCount()` hook in `src/features/authors/application/use-authors.ts`. It asks the authors list endpoint for one row (`pageSize: 1`) and reads the `total` field from the response.
- Its cache key sits under the same group the create and delete actions already refresh, so the count updates after an author is created or deleted without any extra code.
- `src/routes/index.tsx` uses the hook and shows the line in muted text only once a number exists. None of the project's code generators fit this change (the overview one adds a new card rather than changing one), so I wrote it by hand.

**Tests:** `src/features/authors/presentation/overview-authors-count.test.tsx` renders the real app against the mock API and checks three things:
- the card shows `24 authors` from the starting data;
- no number appears before the count arrives;
- after deleting an author on `/authors` and going back to `/`, the card shows `23 authors`.

The tests look for the link inside the Entities section, because the sidebar also has an "Authors" link.
