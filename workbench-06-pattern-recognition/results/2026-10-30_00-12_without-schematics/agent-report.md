Authors now have an optional **Birth year** field. `pnpm typecheck`, `pnpm lint` and `pnpm test:run` all pass (46 tests). I didn't run the e2e gate (`pnpm test:e2e`).

**What changed**
- **Rule:** the author definition in `author.ts` only accepts a whole number from 1000 to 2100. Any other value shows `Must be a year from 1000 to 2100`.
- **Forms:** the create and edit forms have a number input labelled `Birth year (optional)`, after Website. If it's left empty, the author is saved without a birth year.
- **Mock API:** it stores the year as a number on create and on update, and returns 400 for a bad value. A year sent as text, like `"1978"`, is also rejected rather than converted.
- **Detail page:** shows `Birth year` with the value, or `—` when it isn't set.

**Choices you may want to check**
- **Clearing on edit:** an update keeps any field it doesn't send, and an empty value gets dropped from the request. So the edit page sends `birthYear: null` when the field is cleared, and the mock API treats `null` as "not set". Website already works this way using `''`. To allow this, the update request type is now `AuthorPatch`, a new type in `author.ts`.
- **Non-numeric typing:** browsers report unreadable input in a number field (like `12e`) as empty. Without a fix, the form would quietly save it as "no birth year". The form now checks the browser's flag for this and shows the error instead. The test environment can't fake that flag, so this part has no automated test.

**Tests added**
- **Mock API:** stores the year on create; leaves it unset when omitted; returns 400 for `999`, `2101`, `1978.5` and `"1978"` on both create and update; and an update can set, keep and clear it.
- **Forms and detail page:** the field is a number input marked optional; `999`, `2101` and `1978.5` are rejected; `2100` is accepted; creating with and without a year works; the detail page shows `—` when unset; and the edit form can set and then clear it.
