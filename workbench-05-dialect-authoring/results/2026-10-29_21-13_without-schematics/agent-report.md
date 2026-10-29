I've written the four schematics and registered them in the `default` collection. `bun test schematics` passes (42 tests), and `builder info default:<name>` describes each one. Each lives in `schematics/<name>/` with `factory.ts`, `schema.json`, the generated `schema.generated.ts` and `factory.test.ts`. Factories edit files only through `find().read()` and `replaceContent()` from `@pbuilder/sdk/commons`.

**What each one does**
- **`sidebar-entry`**: adds the icon to the existing `lucide-react` import (keeping it in alphabetical order) and appends the `/<plural>` entry as the last item in `NAV`.
- **`overview-card`**: adds the icon to the `lucide-react` import and appends a copy of the Authors card markup just before `</section>` in the `Entities` section. Text containing `{`, `}`, `<`, `>` or `&` is written as `{'…'}` so it stays valid JSX.
- **`handlers-registration`**: adds the import to each file next to the other `./domains/*` imports, and adds the spread and the `reset<Plural>()` call. If the returned array would no longer fit on one line, it switches to one entry per line. It checks both files before writing either.
- **`route-keys`**: appends whichever of the five keys are missing to `MockRouteKey`. Multi-word names become `BOOK_REVIEW`-style keys, and `book-review` gives `bookReviewHandlers` and `resetBookReviews`.

**Running twice and failing.** Each schematic checks every piece separately and only writes if something changed, so a second run changes nothing. A half-done registration gets finished without duplicates. If the file or its anchor is missing (`NAV`, the `Entities` section, `createHandlers`'s returned array, `afterEach`, `MockRouteKey`), it throws an error naming the file, and every check runs before anything is written.

**Checking it with the real engine.** As you asked, I didn't run the schematics on this repository. I ran all four on a throwaway copy in `/tmp` with the `book` example, then deleted it:
- The diff matched the existing style exactly.
- Running them a second time reported "no changes".
- With `afterEach` removed, `handlers-registration` failed with `mocks/setup-test-mocking.ts: could not find afterEach(...)` and left `handlers.ts` untouched.

**Choices you may want to change**
- Each schema declares all five inputs, with unused ones optional, so the same five flags can be passed to every schematic. Only the inputs a schematic uses are required.
- Inputs are checked: names must be kebab-case and the icon PascalCase. A schematic also stops with an error rather than writing a broken file in two cases:
  - the icon name is already used in the file, for example `Link`;
  - the route already has an entry or card with a different title or icon.
- The schematics don't check that the icon actually exists in `lucide-react`; `pnpm typecheck` will catch a wrong name.
- Each test file also runs its schematic in memory against the current version of the real file, using the name `zz-probes`. That way the tests fail if someone renames an anchor such as `NAV`.

**Other things to know**
- `.gitignore` excludes `schematics/*`, so the schematic files don't show in `git status`. The only tracked change is `project-builder.json`; force-add the folders or change the ignore rule if you want them committed.
- oxlint skips gitignored paths, so the factories haven't been linted. They do pass a strict `tsc` check with no unused locals.
- I didn't add a `test:schematics` script to `package.json`; `bun test schematics` works as is.
