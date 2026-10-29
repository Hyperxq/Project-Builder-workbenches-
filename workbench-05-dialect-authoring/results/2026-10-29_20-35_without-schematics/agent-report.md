I've written the four schematics and registered them in the `default` collection. `bun test schematics` passes (29 tests across 4 files), and `builder info default:<name>` describes each one. None of the repository's source files were changed.

**What each one does** (exact text for `book` / `books` / `Books` / `BookOpen`):
- **`sidebar-entry`**: adds `BookOpen` to the existing `lucide-react` import and appends `{ to: '/books', label: 'Books', icon: BookOpen },` after the Authors line in `NAV`.
- **`overview-card`**: adds the icon import and appends a copy of the Authors card markup, with the entity's values, as the last child of the `Entities` section.
- **`handlers-registration`**: adds the two imports from `./domains/books.mock`, changes the return to `[...authorHandlers(config, base), ...bookHandlers(config, base)]`, and adds `resetBooks()` after `resetAuthors()`. Once the array gets too long for one line, it switches to one entry per line.
- **`route-keys`**: appends `'LIST_BOOKS'`, `'GET_BOOK'`, `'CREATE_BOOK'`, `'UPDATE_BOOK'` and `'DELETE_BOOK'` to `MockRouteKey`. It only adds the keys that are missing.

**How the requirements are met:**
- **Second run:** each schematic checks whether its edit is already there, and only writes when the text actually changes.
- **Missing code:** the error names the file, for example `mocks/setup-test-mocking.ts: could not find the afterEach(() => { ... }) hook. Nothing was written.` `handlers-registration` reads and checks both of its files before scheduling any write. Reading a file sends earlier writes to disk, so this order means a problem in either file leaves both untouched.
- **Tests:** each `factory.test.ts` starts from a copy of the current file and compares the whole result. It covers the edit, the second run, the missing-code failure and a missing file. There are a few edge cases too: an icon that's already imported, an icon that clashes with another import (such as `Link`), quotes and JSX characters in text, and multi-word names like `book-review`.

**How I checked it:**
- In memory, I ran all four schematics on the real files without writing to disk. The diffs are exactly the intended edits, and a second pass changed nothing.
- On a throwaway copy of the repo in `/tmp` (now deleted), I ran the real `builder execute`. The output was identical to the in-memory run, the re-run reported "no changes", and with `afterEach` removed it failed with the message above and wrote neither file.
- The code type-checks under strict mode and passes oxlint.

**Decisions you might want to change:**
- **Inputs:** every schema declares all five inputs, so one set of flags works for any of the four. The ones a schematic doesn't use are optional and labelled "ignored by this schematic".
- **Shared helper:** common text handling lives in `schematics/_shared/source-edit.ts`, which the factories import. The real engine handles this, but a schematic moved somewhere else on its own would need that file too.
- **Unsupported shapes:** if the file is shaped differently from today, the schematic fails with a clear error rather than guessing. That covers, for example, `createHandlers` written as an arrow function.
- **Not in git:** `.gitignore` excludes `schematics/*` (except `.gitkeep`), so git sees none of these files; the only tracked change is `project-builder.json`. That rule looks deliberate, so I left it alone. If you want to commit the schematics, you'll need to un-ignore them or use `git add -f`.
