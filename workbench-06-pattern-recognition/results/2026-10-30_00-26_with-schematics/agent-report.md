Authors now have an optional Bio field. `pnpm typecheck`, `pnpm lint` and `pnpm test:run` all pass (61 tests). I didn't run `pnpm test:e2e`, which AGENTS.md also lists as a gate, and I didn't add an e2e test for the field.

I generated the field with the repo's `author-field` schematic, the same pattern Website and Birth year used:
- **Rule:** `bio` is an optional text field, trimmed and limited to 500 characters. Anything longer shows `Must be at most 500 characters` under the input.
- **Forms:** the create and edit forms have a `Bio (optional)` input below Birth year. Leaving it blank saves the author without a bio.
- **Mock API:** it stores the bio on create and on update, trimming surrounding spaces and storing a blank value as not set.
- **Detail page:** a `Bio` row appears before Status and shows `—` when there is no bio.

New tests:
- **API tests** (in `mocks/domains/authors.mock.spec.ts`): trimming on create and update, empty or blank stored as not set, no bio sent, and the bio surviving unrelated updates.
- **Form and page tests** (new file `author-bio.test.tsx`): the input is marked optional; 501 characters is rejected and exactly 500 is accepted, on both forms; the trimmed value shows on the detail page; an empty input saves with `—`; and setting a bio from the edit form works.

Two limits:
- **Can't clear an existing bio from the edit form.** Emptying the input sends nothing for `bio`, and the mock's update keeps the old value. Country and Website already behave this way. Sending `bio: ""` directly to the API does clear it, and the tests cover that.
- **The 500-character limit is only checked in the form.** The mock API doesn't reject a longer bio, the same as other fields, where it only checks the required ones.
