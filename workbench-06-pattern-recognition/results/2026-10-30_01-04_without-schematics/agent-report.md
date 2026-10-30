Authors now have an optional **Pen name** field (`penName`). `pnpm typecheck`, `pnpm lint` and `pnpm test:run` all pass (64 tests). I also added a pen name step to the edit scenario in `e2e/authors.spec.ts`, but I didn't run `pnpm test:e2e`, so that change hasn't been tested yet.

What changed, following the same pattern as the earlier Bio field:

- **Domain** (`author.ts`): `penName` is optional, and when set it must be non-empty text after trimming.
- **Form** (`author-form.tsx`): a `Pen name (optional)` input placed after Country. Spaces around the value are trimmed, and an empty input saves the author without a pen name.
- **Edit page**: if you clear the pen name, the page sends it as `''` so the update actually removes it. Without this, the update keeps the old value, because a missing field means "don't change it".
- **Mock API** (`authors.mock.ts`): create and update trim the value, and store an empty or blank one as not set. Updates that don't mention the pen name leave it alone.
- **Detail page**: shows `Pen name`, or `—` when it isn't set.

**Tests added:**
- **Mock API** (2 tests): create with a trimmed value, a blank value and an empty value; then update, an unrelated update that keeps it, and clearing it.
- **Form and pages** (5 tests): the input is marked optional; creating with a value shows it trimmed on the detail page; leaving it blank shows `—`; `—` shows for an existing author without one; setting and then clearing it from the edit form.

One thing I noticed but didn't change: Country doesn't get the same handling on the edit page, so clearing an existing country when editing probably doesn't remove it. It's a one-line fix if you want it.
