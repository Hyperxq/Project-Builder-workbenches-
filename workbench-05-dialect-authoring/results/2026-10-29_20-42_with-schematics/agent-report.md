I've written the four schematics and registered them in the `default` collection. `bun test schematics` passes (24 tests), and `builder info default:<name>` describes each one. I didn't run any of them against the repo's files: the only tracked changes are the registrations in `project-builder.json` and one script I added to `package.json`.

| Schematic | File edited | How |
|---|---|---|
| `sidebar-entry` | `src/app/shell/app-sidebar.tsx` | `addImport` adds the icon to the `lucide-react` import in alphabetical order; `addArrayElement` appends the entry to `NAV` |
| `overview-card` | `src/routes/index.tsx` | `addImport` for the icon; `addJsxChild` adds the card as the last child of the `Entities` section |
| `handlers-registration` | `mocks/handlers.ts`, `mocks/setup-test-mocking.ts` | `addImport` for both imports; `.modify()` for the spread and the reset call |
| `route-keys` | `mocks/core/types.ts` | `.modify()` |

I used `.modify()` where no row in `dialects.md` fits: an array inside a `return`, a statement inside the `afterEach` callback, and members of a type union.

**How the requirements are met:**
- **Repo style:** with `books` as input, the output is byte-for-byte the Author pattern: the card markup matches the Authors card exactly, and new route keys go one per line as `| 'X'`. When adding a domain would push the `return [...]` line past 100 columns, the array switches to one element per line with trailing commas, like `NAV`.
- **Second run:** each test runs the schematic again on its own output and checks that nothing is written.
- **Missing code:** each schematic fails with an error that names the file, whether the file itself is missing or `NAV`, the `Entities` section, `createHandlers`' returned array, `afterEach` or `MockRouteKey` is. Nothing is written. For `handlers-registration`, if either file is broken, neither is changed.
- **Inputs:** names must be kebab-case and `icon` PascalCase. Multi-word names work: `book-review` gives `bookReviewHandlers`, `resetBookReviews` and `LIST_BOOK_REVIEWS`. A title or description containing `{ } < >` is written as `{'…'}` in JSX.

**Things to know:**
- **The schematics aren't tracked by git.** `.gitignore` excludes `schematics/*`, and its comment says that's on purpose. If you want to commit them, add an exception for `schematics/`.
- **Renamed entries get duplicated.** Rerunning with the same inputs changes nothing, but rerunning `sidebar-entry` or `overview-card` with a different title for the same `plural` adds a second entry rather than updating the first.
- **The tests use copies of the target files.** Each test seeds its own copy, trimmed slightly. If the real files change shape, the tests won't notice.
- **Icon names aren't checked.** `icon` must be PascalCase, but nothing checks that it exists in `lucide-react`; a wrong name only shows up at typecheck.
- **New script:** `"test:schematics": "bun test schematics"` in `package.json` runs these tests. The bun test files sit outside the vitest include globs, so `pnpm test:run` doesn't pick them up.
