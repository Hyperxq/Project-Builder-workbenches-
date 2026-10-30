The Authors card on the Overview page now shows the count, for example `24 authors`, below its description. While the count is loading the card shows no number. `pnpm typecheck`, `pnpm lint` and `pnpm test:run` all pass (29 tests). I didn't run `pnpm test:e2e` and didn't add a browser test for the card.

**How it works**
- The count is the `total` field from the authors list endpoint. It asks for a page of one author because it only needs the total.
- Creating or deleting an author marks the count as out of date, so the card shows the new number next time the Overview page opens.
- If the request fails, the card shows no number and no error message.

**Changes**
- `use-authors.ts`: a new `useAuthorsTotal()` hook that fetches the total.
- `authors-count.tsx`: a new small component that shows `<n> authors` once the total is known and nothing before that.
- `src/routes/index.tsx`: the card now includes that component.

**Tests** (`authors-count.test.tsx`), all run against the full app with the mock server:
- The card shows `24 authors`, the number of authors in the mock data.
- While the request is held back, the card shows no number; once it's let through, `24 authors` appears.
- After an author is created through the API, the card shows `25 authors`.
- After an author is deleted on the Authors page, going back to Overview shows `23 authors`.
