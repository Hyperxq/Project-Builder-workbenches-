The Authors card on the Overview page now shows the author count (for example `24 authors`) below its description. `pnpm typecheck`, `pnpm lint` and `pnpm test:run` all pass (33 tests). I didn't run `pnpm test:e2e`, which AGENTS.md also lists as a gate.

**How it works**
- **Getting the number:** a new hook, `useAuthorsTotal()` in `src/features/authors/application/use-authors.ts`, asks the authors list endpoint for one row (`pageSize: 1`) and reads the total from the response. It's cached alongside the other author list queries, so creating, editing or deleting an author refreshes the count.
- **Showing it:** a new `AuthorsCount` component (`src/features/authors/presentation/authors-count.tsx`) shows `<n> authors` and shows nothing until the total has loaded. It's added to the card in `src/routes/index.tsx`.

**Tests** (`src/features/authors/presentation/authors-count.test.tsx`), run against the real app and mock API:
- The card shows `24 authors`.
- While the request is held open, the card shows no number; once it's released, the returned count appears.
- Deleting an author on the Authors page and going back to Overview shows `23 authors`.
- Creating an author and going back to Overview shows `25 authors`.

If the count request fails, the card shows no number at all, the same as while loading.
