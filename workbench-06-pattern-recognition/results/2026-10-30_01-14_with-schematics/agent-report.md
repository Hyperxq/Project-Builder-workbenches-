Authors now have an optional **Pen name** field (`penName`), and `pnpm typecheck`, `pnpm lint` and `pnpm test:run` all pass (56 tests). I didn't run `pnpm test:e2e`, which AGENTS.md lists as a fourth gate.

**How it was built:** most of the code came from the repo's `author-field` schematic (`--key=penName --title="Pen name" --schema="z.string().trim().min(1)"`). I checked what it wrote against your spec:
- **Data rule:** when set, a pen name must be non-empty text, the same rule Country uses.
- **Forms:** the create and edit forms have a `Pen name (optional)` input. An empty or spaces-only value saves the author without one.
- **Mock API:** create and update trim the value, and store an empty one as not set. An update that doesn't mention `penName` keeps the existing value.
- **Detail page:** a `Pen name` row shows the value, or `—` when it isn't set.

**One addition you didn't ask for:** I added a check to the mock API (`mocks/domains/authors.mock.ts`). Without it, sending a `penName` that isn't text (say, `42`) would make the mock crash with a 500 error. It now rejects that with a 400, as it already does for a bad `bio`.

**New tests:**
- Mock API (`authors.mock.spec.ts`): saving on create and on update with trimming, an empty value counting as not set, the value surviving an unrelated update, and the 400 for a non-text value.
- Forms (`author-form.test.tsx`): the input is marked optional, creating with a pen name shows it trimmed on the detail page, a blank one shows `—`, and editing an author to add one works.
