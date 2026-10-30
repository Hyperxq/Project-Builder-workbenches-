Authors now have an optional **Birth year** field (`birthYear`). `pnpm typecheck`, `pnpm lint` and `pnpm test:run` all pass, with 46 tests. I didn't run the Playwright end-to-end tests (`pnpm test:e2e`), since you didn't ask for them.

I made the change with the project's `author-field` generator, set to number mode, then checked what it wrote:
- **Schema** (`domain/author.ts`): a whole number from 1000 to 2100, optional. Every failure, including a value that isn't a number, shows `Must be a year from 1000 to 2100`. I split the generated one-line schema across several lines so it's easier to read.
- **Forms** (`author-form.tsx`): a number input labelled `Birth year (optional)`, placed after Website, with the error shown under it. Leaving it empty saves the author without a birth year.
- **Mock API** (`authors.mock.ts`): stores it as a number on create and on update, and keeps it when an update doesn't include it.
- **Detail page**: a `Birth year` row that shows `—` when it isn't set.

**Tests added:**
- `author-birth-year.test.tsx` (form and page tests):
  - the input is a number input marked optional
  - 999, 2101 and 1999.5 are rejected with the message
  - 1000 and 2100 are accepted
  - creating with and without a birth year works
  - the detail page shows `—` when it isn't set
  - setting it and rejecting a bad value both work on the edit form
- `authors.mock.spec.ts` (mock API tests): it's stored as a number on create, left out when none is sent, and set on update and kept by later updates that don't mention it.

Two gaps you should know about. Country and Website have them too, so I left them alone:
1. **You can't remove a birth year by editing.** Clearing the input sends nothing for it, and the mock's update keeps the old value.
2. **The mock API doesn't check the value.** Only the form enforces 1000–2100. A request sent straight to the mock with a bad value or a string would be stored as is, which matches how Website is handled.
