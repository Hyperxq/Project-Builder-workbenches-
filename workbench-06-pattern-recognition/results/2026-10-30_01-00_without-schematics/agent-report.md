Authors now have an optional Bio field. It's in the create and edit forms, stored by the mock API and shown on the detail page. `pnpm typecheck`, `pnpm lint` and `pnpm test:run` pass (53 tests), and so does `pnpm test:e2e` (7 tests).

**What changed:**
- **Rules** (`domain/author.ts`): `bio` is optional text of at most 500 characters. Going over shows `Must be at most 500 characters`. The 500 limit lives in one shared constant, `BIO_MAX_LENGTH`.
- **Form** (`author-form.tsx`): a `Bio (optional)` box placed after Birth year, styled like Country. I used a multi-line text box rather than a one-line input, since bios tend to run long. I didn't put a hard character cap on the box itself: that would silently cut off extra text, and the error message would never appear. Surrounding spaces are trimmed, and an empty box saves the author without a bio.
- **Edit page**: clearing the bio sends an empty value, so the API removes it. Without this, a cleared bio would keep its old value. This is the same approach Website already uses.
- **Mock API** (`authors.mock.ts`): it trims the bio and stores an empty one as not set, on both create and update. A bio over 500 characters gets a 400 error. Updates that don't mention the bio leave it as it was.
- **Detail page**: shows `Bio` after Birth year, or `—` when it isn't set. Line breaks in the text are kept and long words wrap.

**Tests added:**
- **Mock API:** trimming and empty-as-not-set on create; exactly 500 characters accepted and 501 rejected; setting, keeping and clearing the bio through updates.
- **Forms:** the field is marked optional; the over-500 error appears and the form doesn't submit; creating with and without a bio; the `—` on the detail page; setting and then clearing it from the edit form.
- **End-to-end:** the existing detail-and-edit test now also fills in a bio and checks it appears.

The 500-character limit applies after trimming, so leading and trailing spaces don't count toward it.
