The four schematics are written and registered in the `default` collection: `sidebar-entry`, `overview-card`, `handlers-registration` and `route-keys`. `bun test schematics` passes (30 tests), and `builder info default:<name>` describes each one with its inputs.

**How they edit files.** Every factory reads with `find(path).read()`, edits the text, and writes with `replaceContent`, using only `@pbuilder/sdk/commons`. All checks run before anything is scheduled, so a failure writes nothing. If an edit is already there, no write happens.

**Testing.** I didn't run any schematic against this repository's files; the only tracked change here is the registration in `project-builder.json`. To check them against the real engine, I ran all four with `builder execute` in a throwaway copy of the repo under `/tmp`, now deleted:
- **The edit:** each produced a diff matching the Authors code: icon added to the existing `lucide-react` import in alphabetical order, new import line next to `./domains/authors.mock`, and entries added after the existing ones.
- **Second run:** reported "no changes".
- **Missing code:** with `afterEach` removed, `handlers-registration` failed with `mocks/setup-test-mocking.ts: could not find afterEach(...)` and wrote neither file.
- **Extra inputs:** a schematic ignores flags it doesn't declare, so the same five-flag command works for all four.

Each `factory.test.ts` covers the edit (compared exactly against the expected file), the second run (no writes) and the missing-code failure (error names the file, no writes). The tests use copies of the current target files stored in `schematics/_shared/fixtures/`, so adding real entities later won't break them.

**Choices you might not expect:**
- **Names with hyphens:** a multi-word entity like `book-review` gives `bookReviewHandlers`, `resetBookReviews` and `GET_BOOK_REVIEW`. Pasting the kebab name in directly would give `book-reviewHandlers`, which isn't valid TypeScript.
- **Long handler arrays:** the `return [...]` in `createHandlers` stays on one line up to 100 columns, then switches to one domain per line. With `author` and `book` it stays on one line; a third entity switches it.
- **Inputs are checked:** names must be kebab-case. `title` and `description` can't contain `{ } < >` or line breaks, since they go into JSX unescaped. Quotes in the sidebar label are escaped.
- **Icon name clashes:** an icon whose name is already imported from another module (for example `Link`, which comes from the router) fails with a suggestion to use lucide's `LinkIcon` alias instead.
- **Shared helper module:** the import and bracket-matching code lives in `schematics/_shared/source-edit.ts`, which all four import. The real engine resolves that import fine.

**Git won't track the schematics.** `.gitignore` excludes `schematics/*` on purpose; its comment says that folder is benchmark output that's never committed. I left that rule alone, so the files exist on disk but `git status` hides them. If you want them committed, that rule needs changing.

I also didn't add the `test:schematics` package script the skill suggests, to avoid editing `package.json`.
