Author four Project Builder schematics in this repository's `default` collection. Each one makes one of the registration edits that every new entity repeats; the Author module is the registered example to copy from. Write only the schematics: do not add an entity, and do not run a schematic against this repository's files.

All four take these inputs, and each uses the ones it needs:

- `singular`: kebab-case singular name, for example `book`
- `plural`: kebab-case plural name, for example `books`
- `title`: display name, for example `Books`
- `icon`: a `lucide-react` icon name, for example `BookOpen`
- `description`: one sentence for the overview card, for example `Catalogue of books.`

Derived names follow the Author module: `Book` / `Books` for the PascalCase forms and `BOOK` / `BOOKS` for the route keys.

1. `sidebar-entry` (`plural`, `title`, `icon`): in `src/app/shell/app-sidebar.tsx`, import `icon` from `lucide-react` and append `{ to: '/<plural>', label: '<title>', icon: <icon> }` to `NAV`, after the existing entries.
2. `overview-card` (`plural`, `title`, `icon`, `description`): in `src/routes/index.tsx`, import `icon` from `lucide-react` and append a card for the entity as the last child of the `Entities` section, with the same markup as the Authors card: the `Link` to `/<plural>`, the `icon`, the `title` and the `description`.
3. `handlers-registration` (`singular`, `plural`): in `mocks/handlers.ts`, import `<singular>Handlers` from `./domains/<plural>.mock` and add `...<singular>Handlers(config, base)` to the array `createHandlers` returns, after the existing domains; in `mocks/setup-test-mocking.ts`, import `reset<Plural>` from `./domains/<plural>.mock` and call `reset<Plural>()` inside `afterEach`, after the existing resets.
4. `route-keys` (`singular`, `plural`): in `mocks/core/types.ts`, append `'LIST_<PLURAL>'`, `'GET_<SINGULAR>'`, `'CREATE_<SINGULAR>'`, `'UPDATE_<SINGULAR>'` and `'DELETE_<SINGULAR>'` to the `MockRouteKey` union, after the existing members.

Every schematic must:

- leave the edited files in the repository's style (two-space indentation, single quotes, no semicolons, imports at the top);
- change nothing when it runs a second time with the same inputs;
- fail with an error that names the file when the code it edits around is missing, and write nothing in that case;
- have a `factory.test.ts` that runs under `bun test` and covers the edit, the second run and the missing-code failure.

When you are done, `bun test schematics` passes and each schematic is registered, so `builder info default:<name>` describes it.
