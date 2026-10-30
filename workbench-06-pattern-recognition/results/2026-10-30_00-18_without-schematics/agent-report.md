Authors now have an optional **Pen name** field. `pnpm typecheck`, `pnpm lint` and `pnpm test:run` all pass (78 tests). I didn't run the Playwright e2e suite (`pnpm test:e2e`) and didn't add an e2e test for the field.

- **Data model:** `penName` is optional and, when set, must be non-empty text.
- **Forms:** create and edit have a `Pen name (optional)` input, placed between Country and Website. Spaces around the value are trimmed, and a blank input saves the author without a pen name.
- **Edit page:** clearing the input removes the pen name. This needs care because an update only changes the fields it sends, and an empty field would otherwise be dropped from the request. So the edit page sends `penName: ''`, the same way Website and Bio are cleared.
- **Mock API:** create and update store the trimmed value, and an empty or blank value is stored as not set. An update that doesn't include `penName` leaves it as it was. One addition you didn't ask for: a pen name that isn't text (e.g. `42`) is rejected with a 400 error, matching how the other text fields are checked.
- **Detail page:** shows `Pen name`, or `—` when it isn't set.

**Tests added:**
- **Mock API** (`authors.mock.spec.ts`): the value is stored trimmed on create; a missing, null, empty or blank value isn't stored; non-text values get a 400 on create and update; an update can set it, leave it alone, or clear it.
- **Forms and detail page** (`author-form.test.tsx`): the input is labelled optional on both forms; creating with a trimmed value or with a blank one; the detail page shows `—` when the field is empty; the edit form can set the value and then clear it.
