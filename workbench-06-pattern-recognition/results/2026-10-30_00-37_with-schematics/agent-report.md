Authors now have an optional Bio field. `pnpm typecheck`, `pnpm lint` and `pnpm test:run` pass (45 tests), and so does `pnpm test:e2e` (7 tests).

I added it with the repo's own `author-field` schematic, then read through what it wrote. It changed four files:
- **Domain** (`author.ts`): `bio` is optional and must be at most 500 characters after trimming, with the message `Must be at most 500 characters`.
- **Form** (`author-form.tsx`): a `Bio (optional)` input styled like Country on both create and edit. An empty or all-spaces value is sent as not set, and the error shows under the input.
- **Mock API** (`authors.mock.ts`): create and update both trim the bio and store an empty one as not set.
- **Detail page** (`author-detail-page.tsx`): a `Bio` row showing the value, or `—` when it isn't set.

New tests:
- **Mock API**: trims on create and on update, stores a blank value as not set, and clearing it with `""` on update removes it.
- **Form and detail page**: 501 characters is rejected with the message, exactly 500 is accepted, leaving it blank saves without a bio, entering a bio on create shows it trimmed on the detail page, unset shows `—`, and editing it works.
- **E2E**: the edit journey now fills in Bio and checks it appears on the detail page.

**Limits worth knowing:**
- The 500-character limit is only checked in the form. Like Website and Birth year, the mock API doesn't validate it, so a longer bio sent straight to the API is still stored.
- On the edit form, emptying a bio that was already set doesn't remove it. The form leaves the empty field out of the request, and the API only changes fields that are sent, so the old bio stays. Country and Website already behave the same way, so I didn't change it here. The API itself does clear the bio when it receives `""`.
