I've written the four schematics in the `default` collection. `bun test schematics` passes (34 tests), and `builder info default:<name>` describes each one with its inputs. No entity was added, and none of the repository's app or mock files changed.

| Schematic | Edits | How |
|---|---|---|
| `sidebar-entry` | `app-sidebar.tsx` | `addImport` + `addArrayElement` on `NAV` |
| `overview-card` | `routes/index.tsx` | `addImport` + `addJsxChild` on `<section aria-label="Entities">` |
| `handlers-registration` | `mocks/handlers.ts`, `mocks/setup-test-mocking.ts` | `addImport`, then `.modify()` for the return-array spread and the `afterEach` call |
| `route-keys` | `mocks/core/types.ts` | `.modify()` on the `MockRouteKey` union |

I used `.modify()` only where the dialects table has no matching row. `addArrayElement` explicitly doesn't reach an array inside a `return`, `addHookCall` only works on components (not `afterEach`), and nothing covers union types.

**Checks:** I couldn't run the schematics on the repository's files, so I ran each one through the real `builder execute` on a throwaway copy in `/tmp`, now deleted:
- **First run:** each edit came out exactly as specified, in the repo's style. For `books`, `handlers.ts` ends up with `return [...authorHandlers(config, base), ...bookHandlers(config, base)]`.
- **Second run:** all four reported "no changes".
- **Missing code:** with `afterEach` removed, `handlers-registration` failed with `mocks/setup-test-mocking.ts: no top-level afterEach(...) call found` and left `handlers.ts` unwritten as well.

**Things to know:**
- **Error messages:** if code is thrown from inside `.modify()`, the SDK replaces my message with a generic `modify() on "<file>" threw`. So the factories record what's missing, then throw `<file>: <reason>` once the edit finishes, which still writes nothing.
- **Multi-word names:** `book-club` gives `bookClubHandlers`, `resetBookClubs` and `BOOK_CLUB`, and inputs that aren't kebab-case are rejected.
- **Collisions and escaping:** an icon named `Link` or `Card…` would clash with names `index.tsx` already imports, so `overview-card` rejects it and suggests lucide's `…Icon` alias. Quotes and `{ } < > &` in the title or description are escaped.
- **Layout:** the handlers array and the union stay on one line until they pass 100 columns, then switch to one item per line.
- **Drift check:** each test file also runs the schematic, in memory, on the repo's current file. If someone reshapes `NAV` or the Entities section later, the test suite will show it.

**Before you commit:** `.gitignore` has `schematics/*`, so `git status` shows only `project-builder.json` and none of the new files. Commit them with `git add -f schematics/`, or add an exception to `.gitignore`. Also, the scaffolder sorted the keys in `project-builder.json`, which moved `"version"` to the bottom; only the order changed.
