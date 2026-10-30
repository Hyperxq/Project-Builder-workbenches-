Authors now have an optional Pen name field. `pnpm typecheck`, `pnpm lint` and `pnpm test:run` all pass (75 tests). I didn't run the e2e suite.

**One gap:** clearing a pen name that's already saved, using the edit form, doesn't remove it. The empty input is left out of the save request, and the mock API's update then keeps the old value. Country, Website, Birth year and Bio already have the same problem, so I left it alone rather than change how editing works for every field. I confirmed it with a test, then removed that test. Fixing it would mean sending cleared fields explicitly on edit (or having the update handler accept `null`) for all optional fields. That would be a good separate change if you want it.

**What changed:** I generated the field with the project's `author-field` schematic, which covers what you asked for:
- **Schema:** `penName` is optional, and when set it must be non-empty text after trimming (`author.ts`).
- **Forms:** the create and edit forms have a `Pen name (optional)` input like Country. Leaving it empty saves the author without it.
- **Mock API:** create and update both store it, trim surrounding spaces, and store an empty or blank value as not set.
- **Detail page:** a `Pen name` row shows the value, or `—` when it's not set.

**Tests added:**
- `mocks/domains/authors.mock.spec.ts`: storing it trimmed on create and update, keeping it when an update doesn't touch it, treating empty or blank values as not set, and creating an author without one.
- `src/features/authors/presentation/author-pen-name.test.tsx`: the optional input on the create form, creating with a trimmed pen name, creating without one, the `—` on the detail page, and setting it from the edit form.
