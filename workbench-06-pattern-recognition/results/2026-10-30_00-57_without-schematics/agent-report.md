Authors now have an optional **Birth year** field. `pnpm typecheck`, `pnpm lint` and `pnpm test:run` (42 tests) pass, and so does `pnpm test:e2e` (7 tests).

**What changed**
- **Validation rule** (`domain/author.ts`): `birthYear` is an optional whole number from 1000 to 2100. Any other value shows `Must be a year from 1000 to 2100` under the input.
- **Form** (`author-form.tsx`): a number input labelled `Birth year (optional)`, styled like Country, on both the create and edit forms. Leaving it empty saves the author without a birth year.
- **Detail page**: shows `Birth year`, or `—` when it isn't set.
- **Mock API**: create and update both store the birth year as a number and return 400 for anything out of range or not a whole number. Two choices I made that you didn't specify:
  - It also accepts a numeric string such as `"1947"` and converts it to a number.
  - `null` or an empty value means "no birth year".

**Clearing it on edit:** an update request only changes the fields it sends, and an empty field gets dropped before sending. To let users remove a birth year, the edit page sends `birthYear: null` when the input is empty, the same way Website sends `''`. That needed a small new type for the update request, `AuthorPatch` in `domain/author.ts`, which allows `null` for the birth year; the API client, the update hook and the mock use it.

**Tests added**
- **Mock API** (`authors.mock.spec.ts`):
  - It's stored as a number on create, including from a numeric string.
  - An empty value saves without it.
  - 999, 2101, 1950.5, `'abc'` and `true` are rejected with 400.
  - 1000 and 2100 are accepted.
  - On update it can be set, survives an unrelated change, rejects 3000, and clears with `null`.
- **Form and detail page** (`author-form.test.tsx`):
  - It's a number input marked optional.
  - 999, 2101 and 1950.5 show the error and block submit.
  - Creating with and without it works.
  - The detail page shows `—` when it isn't set.
  - It can be set and then cleared from the edit form.
- **End-to-end** (`e2e/authors.spec.ts`): the existing edit test now also enters a birth year and checks it on the detail page.
