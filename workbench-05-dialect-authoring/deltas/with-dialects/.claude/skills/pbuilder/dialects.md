# Dialects by intent (`@pbuilder/sdk` 0.12.0)

Before you edit an existing file from a factory, find the row for what you
want to do. If a row matches, use its op instead of reading the file and
rewriting it as a string: the op keeps the file's own formatting and is a
no-op when the change is already there, and the ops that target one element
(a JSX element, a component, a class) reject when it is missing or ambiguous.
Use `.modify(ast => …)` or string surgery only when no row matches.

Every dialect opens a file with its own `find(path)`; chained ops edit one AST
and write once. Always `await` the chain.

```ts
import * as ts from '@pbuilder/sdk/typescript'
import * as react from '@pbuilder/sdk/react'

await ts.find('mocks/handlers.ts').addImport('bookHandlers', './domains/books.mock')
await react
  .find('src/routes/index.tsx')
  .addImport('BookOpen', 'lucide-react', { position: 'sorted' })
  .addJsxChild({ tag: 'section', props: { 'aria-label': '"Entities"' } }, '<Link to="/books">…</Link>')
```

## What you want to do

| You want to… | File | Op | Notes |
|---|---|---|---|
| Add a named import, merging into an existing one from the same module | `.ts`, `.tsx`, `.jsx` | `addImport(name, from)` | Idempotent. `{ position: 'sorted' }` puts the name in alphabetical order and a new declaration next to its folder siblings |
| Add a default, namespace, type or side-effect import | `.ts`, `.tsx` | `addDefaultImport`, `addNamespaceImport`, `addTypeImport`, `addSideEffectImport(from)` | `addTypeImport` writes its own `import type` and is a no-op if the name is already imported |
| Remove an import | `.ts`, `.tsx` | `removeImport(name, from)` | Deletes the statement when it was the last binding |
| Re-export from a barrel | `.ts`, `.tsx` | `addReExport(name, from)`, `addExportAll(from, { as? })` | `removeExport`, `removeExportAll` undo them |
| Reorder all imports | `.ts`, `.tsx` | `sortImports()` | Packages first, then relative paths; never moves across a blank line, a comment or a side-effect import |
| Register an item in an array literal (nav entries, routes, handlers list) | `.ts`, `.tsx` | `addArrayElement(locator, element)` | `locator` is `{ variable, path }`, `{ call, argument, path }` or `{ decorator, path }`; `path` is required (`[]` for the array itself). `element` is an identifier or `{ expression: '…' }`. No-op when already listed. Does NOT reach an array inside a `return` or a function body |
| Add a top-level function, variable or class | `.ts`, `.tsx` | `addFunction(name, '(…): T {…}')`, `addVariable(name, initializer)`, `addClass(name, body)` | Function source INCLUDES braces; class body EXCLUDES them. Fail loud on a name collision |
| Add a property to a class | `.ts`, `.tsx` | `addClassProperty(className, name, initializer, { scope?, readonly? })` | No-op when the same property exists |
| Add a child element inside a JSX element (a card in a grid, a route, a nav item) | `.tsx`, `.jsx` | `addJsxChild(target, jsx)` | Appended as the last child; only its first line gets the siblings' indentation, so indent the following lines of a multi-line `jsx` yourself. The same child is a no-op |
| Set or remove a prop on one JSX element | `.tsx`, `.jsx` | `setJsxProp(target, prop, value?)`, `removeJsxProp(target, prop)` | `value`: `'"text"'`, `'{expr}'`, or omitted for a boolean |
| Wrap a JSX element in a provider or layout | `.tsx`, `.jsx` | `wrapJsxElement(target, '<Provider value={x} />')` | No-op when already directly inside that tag |
| Rename a JSX element | `.tsx`, `.jsx` | `renameJsxElement(target, tag)` | Imports are not touched |
| Add a hook call to a component | `.tsx`, `.jsx` | `addHookCall(component, statement)` | Inserted after the component's leading hook calls. Only for a top-level `function` or `const` component, not for any other callback |
| Add a prop to a component's props type | `.tsx` | `addComponentProp(component, name, type, { optional? })` | Updates the props type and the destructured parameter |
| Set, add, rename or remove a key | `.json`, `.jsonc`, `.yaml`, `.yml` | `setValue(path, value)`, `addKey(path, value)`, `renameKey(path, newKey)`, `removeKey(path)` | `path` is an array: `['scripts', 'build']`. Comments, indentation and key order survive |
| Append to a list without duplicates | `.json`, `.yaml` | `appendItem(path, value, { unique: true })` | `insertItem`, `replaceItem`, `moveItem`, `removeItem`, `removeValue` for the other list edits |
| Merge an object, move or copy a value, sort keys | `.json`, `.yaml` | `merge(path, value)`, `moveValue(from, to)`, `copyValue(from, to)`, `sortKeys(path)` | `updateValue(path, fn)` in YAML |
| Comments, anchors, aliases, tags, styles, documents | `.yaml` | `setComment`, `setAnchor`, `setAlias`, `addMergeKey`, `setTag`, `setStyle`, `addDocument` | Each has a `remove…` counterpart where it applies |
| Set or remove a CSS declaration | `.css` | `setDeclaration(target, property, value)`, `removeDeclaration(target, property)` | `target` is `{ selector }`, `{ atRule }` or both; a missing block is created. `getDeclaration` reads one |
| Register a NestJS provider, controller, module import or export | `.ts` (`@Module`) | `addProvider`, `addController`, `addModuleImport`, `addExport` — each `(name, from)` | `@pbuilder/sdk/nestjs`: imports the class and adds it to the decorator |
| Angular routes, providers, inputs, outputs, signals | `.ts` | `addRoute`, `addLazyRoute`, `addComponentImport`, `addComponentProvider`, `addRootProvider`, `addInjection`, `addInput`, `addModel`, `addOutput`, `addSignal`, `addComputed` | `@pbuilder/sdk/angular`, Angular projects only |
| Anything no row covers | `.ts`, `.tsx` | `.modify(ast => …)` | Full ts-morph access to the same AST. Use helpers only from the same dialect's `astLibrary` |

## JSX targets

A JSX `target` is a tag name (`'Button'`) or a tag narrowed by props
(`{ tag: 'Route', props: { path: '"/users"' } }`); prop values use the same
forms as `setJsxProp`. Zero or several matching elements reject the op, so
narrow until exactly one element matches.

## Which entry point

| File | Import |
|---|---|
| `.ts` | `@pbuilder/sdk/typescript` (or `@pbuilder/sdk/nestjs`, `@pbuilder/sdk/angular` in those projects) |
| `.tsx`, `.jsx` | `@pbuilder/sdk/react`, which also carries every TypeScript op |
| `.json`, `.jsonc` | `@pbuilder/sdk/json` |
| `.yaml`, `.yml` | `@pbuilder/sdk/yaml` |
| `.css` | `@pbuilder/sdk/css` |
| Any other file | `@pbuilder/sdk/commons`: `find(path).read()` + string surgery + `replaceContent(path, next)` |
