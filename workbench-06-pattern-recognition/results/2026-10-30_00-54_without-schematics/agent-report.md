Authors now have an optional **Website** field. `pnpm typecheck`, `pnpm lint` and `pnpm test:run` pass (23 tests), and so does `pnpm test:e2e`.

**What changed**
- **Schema** (`domain/author.ts`): `website: z.httpUrl('Must be a valid URL').optional()`. It only accepts `http`/`https` addresses with a proper domain name, so something like `mailto:` or `http://localhost` is rejected. That's my reading of "website"; switching to plain `z.url()` would accept any URL.
- **Form** (`author-form.tsx`): a `Website (optional)` input after Country, on both create and edit. The value is trimmed and an empty box becomes `undefined`, so a blank field passes and the author is saved without it. An invalid value shows `Must be a valid URL` under the input.
- **Detail page**: a `Website` row showing the value, or `—` when it isn't set.
- **Mock API** (`authors.mock.ts`): create and update both trim the website and store an empty value as not set. I also made both return 400 for an invalid website, which you didn't ask for; it checks with the same schema rule as the form, the way the mock already rejects a bad email.
- **Edit page**: an update only changes the fields it sends, and an empty form field is left out of the request entirely. So clearing Website on the edit form would have quietly kept the old value. The edit page now sends `''` for a cleared website, which the mock stores as not set.

**Tests added**
- **Mock API**: create trims the value and stores blank as not set; an invalid URL gets a 400; update sets, clears and rejects the website.
- **Form and pages**: the invalid-URL message appears and nothing is submitted; creating with a website shows it on the detail page; the detail page shows `—` when it's unset; the edit form can set a website and then clear it.
- **E2E**: the existing edit test now fills in Website and checks it appears.

Country has the same clearing problem: emptying it on the edit form keeps the old value. I left it alone since it's outside this change, but the same one-line fix on the edit page would solve it.
