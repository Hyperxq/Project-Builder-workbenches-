Authors now have an optional **Pen name** field (`penName`). `pnpm typecheck`, `pnpm lint` and `pnpm test:run` all pass, with 85 tests across 12 files. I didn't run the Playwright end-to-end tests (`pnpm test:e2e`).

**What changed**
- **Data rule** (`domain/author.ts`): `penName` is optional, and when it's set it must be non-empty text after trimming.
- **Create and edit forms** (`author-form.tsx`): there's a `Pen name (optional)` input after Country. Spaces around the value are trimmed, and an empty or all-spaces input saves the author without a pen name.
- **Clearing on edit** (`author-edit-page.tsx`): saving the edit form always sends `penName`, as an empty value when the input is blank. Updates only change the fields they include, so without this, emptying the input would leave the old pen name in place.
- **Mock API** (`authors.mock.ts`): create and update both store the trimmed value, and an empty value is stored as not set. One addition you didn't ask for: a non-text `penName` (a number, say) is rejected with a 400 error, the same way Bio is handled.
- **Detail page**: shows `Pen name`, or `—` when it isn't set, between Birth year and Bio.
- **Sample data**: Gabriel García Márquez now has the pen name `Gabo`, so the tests have an author with the field set.

**Tests added**
- **Mock API** (`authors.mock.spec.ts`), three tests: create trims the value and treats a blank one as not set; non-text values are rejected on create and update; update trims, leaves the pen name alone when the request doesn't include it, and clears it when given a blank value.
- **App pages** (new `author-pen-name.test.tsx`), eight tests: the input is labelled optional on both forms and pre-filled on edit; creating with a padded value stores the trimmed one; creating with a blank value saves no pen name; the detail page shows the value or `—`; the edit form can set and clear it.
