Authors now have an optional **Bio** field. `pnpm typecheck`, `pnpm lint` and `pnpm test:run` all pass (71 tests, 9 files). I didn't run `pnpm test:e2e`, the Playwright suite that AGENTS.md also lists, and I didn't add an e2e test for Bio.

**What changed**
- **Rules** (`domain/author.ts`): `bio` is optional, has surrounding spaces trimmed, and can be at most 500 characters. A longer one shows `Must be at most 500 characters`.
- **Forms** (`author-form.tsx`): there is a `Bio (optional)` input after Birth year, built the same way as Country. Surrounding spaces are trimmed, an empty input saves the author without a bio, and the error appears under the input.
- **Editing** (`author-edit-page.tsx`): the edit page sends `bio: ''` when the input is empty. Updates only change the fields they include, so without this, clearing the input would leave the old bio in place.
- **Detail page**: shows the bio under the label `Bio`, or `—` when it isn't set. Line breaks are kept and long words wrap.
- **Mock API**: stores the bio on create and update, trims it, and stores an empty value as not set. It also returns 400 for a bio over 500 characters, matching how the website field is checked.
- **Sample data**: author #1 (García Márquez) now has a bio, so the tests have a filled-in case to check.

**Tests**
- **Mock API** (`authors.mock.spec.ts`): trimming on create, empty stored as not set, exactly 500 accepted and 501 rejected on create and update, update trims, an update that leaves bio out keeps it, and `''` clears it.
- **Pages** (new `author-bio.test.tsx`):
  - the input is marked optional on both forms, and the edit form is prefilled
  - the 501-character error appears and blocks saving, while exactly 500 saves
  - creating with a trimmed bio or with none
  - the detail page shows the bio or `—`
  - editing and clearing from the edit form

**Decision for you:** the field is a one-line text input, because the request said "input, like Country". The app already has a multi-line text box component, which may suit a 500-character bio better. Switching is a small change in the form.

**Not fixed:** clearing Country on the edit form doesn't actually remove it, because the form never sends an empty value for it. That bug was there before this change, and I didn't touch it.
