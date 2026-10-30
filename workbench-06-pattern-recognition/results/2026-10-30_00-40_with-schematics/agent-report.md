Authors now have an optional **Pen name** field (`penName`). `pnpm typecheck`, `pnpm lint` and `pnpm test:run` all pass (55 tests). I added a line to the e2e test but didn't run `pnpm test:e2e`.

I generated the field with the project's `author-field` schematic. It uses the same rule as Country: a set pen name has to be non-empty text after trimming spaces. It made these changes:
- **Data rule:** `penName` added to the author schema in `src/features/authors/domain/author.ts`.
- **Forms:** a `Pen name (optional)` input on both the create and edit forms. An empty or all-spaces input saves the author without a pen name.
- **Mock API:** it saves the pen name on create and on update, trims surrounding spaces, and saves an empty value as not set.
- **Detail page:** a `Pen name` row, showing `—` when there is none.

**Tests added:**
- **Mock API:** saving on create and on update, trimming spaces, and an empty value being saved as not set or clearing an existing one.
- **Forms and detail page:** the input is marked optional, a blank pen name saves as not set, a pen name with spaces is shown trimmed on the detail page, editing an existing author's pen name works, and `—` shows when none is set.
- **e2e:** the edit test in `e2e/authors.spec.ts` now fills in a pen name and checks that it appears on the detail page.
