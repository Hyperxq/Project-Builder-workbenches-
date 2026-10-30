Authors now have an optional Bio field. `pnpm typecheck`, `pnpm lint` and `pnpm test:run` all pass (62 tests). I didn't run `pnpm test:e2e`; nothing in the e2e spec relies on what I changed.

- **Domain** (`author.ts`): `bio` is optional text, at most 500 characters, with the message `Must be at most 500 characters`. The limit is a single constant, `BIO_MAX_LENGTH`, which the mock API also uses.
- **Form**: a `Bio (optional)` field sits after Birth year on both the create and edit forms. Spaces around the text are trimmed, and an empty or spaces-only value is saved as not set. It's a multi-line text box rather than a single-line input, because bios tend to run long. There is deliberately no browser length limit on it, so typing or pasting more than 500 characters shows the error under the field instead of being cut off.
- **Edit page**: clearing the bio sends `bio: ''`, so the saved bio is actually removed. Without this, the update would keep the old value. Website already works the same way.
- **Mock API**: create and update trim the bio, store an empty value as not set, and reject anything that isn't text or is longer than 500 characters (after trimming) with a 400.
- **Detail page**: shows `Bio`, or `—` when it's not set. I put it last, across the full width of the details grid, and kept the author's line breaks. This means it appears after Status, not next to the other optional fields.

**Tests added:**
- **Mock API:** saving a trimmed bio, empty values saved as not set, exactly 500 characters accepted, 501 characters or a non-text value rejected on create and update, and set / unchanged / cleared on update.
- **Screens:** the optional label on both forms, the over-500 error, creating with a bio and seeing it on the detail page, leaving it empty, `—` when not set, and setting then clearing it from the edit form.

The 500 limit counts characters the way JavaScript does, so an emoji can count as two.
