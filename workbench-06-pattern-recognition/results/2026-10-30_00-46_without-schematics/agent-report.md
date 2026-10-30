Authors now have an optional **Birth year** field (`birthYear`) on the create and edit forms, in the mock API and on the detail page. `pnpm typecheck`, `pnpm lint` and `pnpm test:run` all pass (56 tests, 7 files). I didn't run `pnpm test:e2e`, the fourth check AGENTS.md lists, and I didn't add an e2e case for the field.

**What it does**
- **Validation:** the rule lives in the author schema (`domain/author.ts`): a whole number from 1000 to 2100. A missing number, a decimal or an out-of-range value all show `Must be a year from 1000 to 2100`.
- **Forms:** `Birth year (optional)` is a number input, placed after Website. Leaving it empty saves the author without the field. On edit, it is filled in when the author has a year.
- **Detail page:** shows the year under `Birth year`, or `—` when it isn't set.
- **Mock API:** stores the value as a number on create and update. It returns 400 for out-of-range values, decimals, non-numeric strings and booleans.
- **Seed data:** I gave Gabriel García Márquez `birthYear: 1927` so there's a set value to show.

**Choices you may want to check**
- **Clearing on edit:** an update only changes the fields it sends, so an omitted field keeps its old value. The edit page therefore sends `birthYear: null` when the input is empty, and the mock treats `null` as "remove". For this I added an `AuthorPatch` type for update requests, which allows `null` here. It's used in the API layer and the update hook.
- **Lenient mock:** the mock also accepts numeric strings like `"1978"` and saves them as the number `1978`. An empty string `''` is treated as "not set". If you'd rather it reject anything that isn't a number, it's a small change in `parseBirthYear`.

**Tests**
- **Mock API** (`authors.mock.spec.ts`): saving on create, converting strings to numbers, creating without the field (omitted, `null` or `''`), the 400 cases, the 1000 and 2100 limits, and that updates set the field, keep it when it isn't sent, clear it with `null` and reject a bad value.
- **Forms and detail page** (new file `author-birth-year.test.tsx`): the input is marked optional and is a number input on both forms, plus the error message for 999, 2101 and 1978.5. It also covers creating with and without a year, the detail display, and setting, rejecting and clearing the year on edit.
