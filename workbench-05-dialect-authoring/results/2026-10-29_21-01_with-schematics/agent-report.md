The four schematics are written and registered in the `default` collection. `bun test schematics` passes (25 tests across 4 files), and `builder info default:<name>` describes each one with its inputs. I didn't add an entity, and I didn't run any schematic against the repository's files.

**What each one does**
| Schematic | Inputs | How it edits |
|---|---|---|
| `sidebar-entry` | plural, title, icon | `react` dialect: `addArrayElement({ variable: 'NAV', path: [] })` and `addImport(icon, 'lucide-react', { position: 'sorted' })` |
| `overview-card` | plural, title, icon, description | `react` dialect: `addJsxChild` on the `<section aria-label="Entities">`, using the Authors card's markup, plus the same sorted `addImport` |
| `handlers-registration` | singular, plural | Imports with `addImport` (sorted). The spread and the reset use `.modify`, because the dialects table says `addArrayElement` can't reach an array inside a `return`, and no row covers adding a call inside `afterEach` |
| `route-keys` | singular, plural | `.modify`, because no row covers adding members to a union type |

The `.modify` edits insert text at exact positions, copying the indentation of the neighbouring line, so the output keeps the repository's style. I diffed a run of all four against the real files, in memory only, and each produced exactly the edit the task asks for.

**Requirements**
- **Running twice:** a second run with the same inputs writes nothing. Route keys that are already in the union are skipped, so it only adds the missing ones.
- **Missing code:** when the code a schematic edits around is missing (`NAV`, the Entities section, `createHandlers` or its returned array, `afterEach`, `MockRouteKey`, or the file itself), it fails with an error that names the file and the missing code, and writes nothing. For `handlers-registration`, if the second file fails, the first file isn't written either; a test covers this.
- **Tests:** each `factory.test.ts` checks the exact output, the second run and the failure cases. They also cover multi-word names (`book-author` → `bookAuthorHandlers`, `resetBookAuthors`, `GET_BOOK_AUTHOR`).

**Additions you didn't ask for**
- **Input checks:** names must be kebab-case and the icon must be a PascalCase name. Quotes in `title` are escaped, and text containing `{ } < >` goes into the card as a string expression.
- **Long arrays:** `createHandlers` returns its array on one line until that line would pass 100 characters; after that, the array is laid out one entry per line.
- **`package.json`:** I added a `test:schematics` script (`bun test schematics`), as the skill suggests.

**Before you commit**
- `.gitignore` contains `schematics/*` (in the "benchmark run output" block), so git won't track the new schematic folders. I left that rule alone because it looks deliberate. Only `project-builder.json` and `package.json` show up as changes.
- `handlers-registration` imports from `./domains/<plural>.mock` without checking that the file exists. Run it after the mock domain is created, or the typecheck will fail.
