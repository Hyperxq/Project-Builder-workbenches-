Authors now have an optional **Website** field. `pnpm typecheck`, `pnpm lint` and `pnpm test:run` all pass, with 22 tests across 3 files. I didn't run the e2e gate (`pnpm test:e2e`), since you didn't ask for it.

I added the field with the repo's `author-field` schematic, which matched the task exactly, and checked what it wrote:
- **Validation** (`domain/author.ts`): `website: z.url('Must be a valid URL').optional()`.
- **Forms** (`author-form.tsx`): a `Website (optional)` input after Country, shared by create and edit. A blank input is treated as not set, and an invalid URL shows `Must be a valid URL` under it.
- **Mock API** (`authors.mock.ts`): create and update both store `website?.trim() || undefined`, so spaces are trimmed and an empty value is stored as not set.
- **Detail page**: a `Website` row after Country, showing `—` when it's not set.

**New tests:**
- **Form and detail page** (`author-form.test.tsx`): an invalid URL shows the error and stays on the page; creating with a website shows it on the detail page; creating without one shows `—`; editing an existing author to add a website works.
- **Mock API** (`authors.mock.spec.ts`): on create, the value is trimmed and a blank one is stored as not set; on update, it's set and trimmed, other edits leave it alone, and an empty string clears it.

Two behaviours you might trip over:
- **Clearing the website in the edit form doesn't remove it.** An empty input is left out of the request, and the mock's update only changes fields that are sent, so the old value stays. Country already works the same way, so I left it. Fixing it would mean the form sending an explicit empty value for cleared optional fields.
- **The form doesn't trim before checking the URL.** A URL with a trailing space is rejected in the form, even though the mock API would trim it. The Email field behaves the same way.
