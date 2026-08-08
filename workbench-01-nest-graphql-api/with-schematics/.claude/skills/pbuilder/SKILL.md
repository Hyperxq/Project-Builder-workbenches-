---
name: pbuilder
description: Project Builder CLI + SDK distilled reference — commands, schematic authoring, proven gotchas. Load INSTEAD of exploring the SDK/CLI repos.
---

# Project Builder — distilled reference (CLI v0.6.0, @pbuilder/sdk 0.2.x)

**Context discipline**: this file + `AGENTS.md` carry everything needed for
routine work. Do NOT re-explore `~/Projects/Project-Builder-Renaissance/`
(SDK/CLI/engine sources) unless changing the schematic infrastructure itself.

## Commands that actually work

- `builder new schematic <name>` — scaffold a local schematic (`builder add` is a STUB, despite older docs).
- `builder execute default:<name> --input=value` — run it. Global flags go BEFORE the positional; everything after is schematic input.
- `builder skill update` — regenerates this file on CLI upgrades (re-apply this content if it does).
- Inputs are CLI flags only (no JSON file, no stdin). `list` type accumulates by repeating the flag; commas are literal. Execute never prompts — already non-interactive. `--dry-run` currently fails closed; don't use.
- Run `builder execute` as a STANDALONE command, one per Bash call. Inside compound shell commands (for-loops, pipes) the native engine dies with `engine_native_system_fault`; sequential single calls also avoid racing the shared `src/app.module.ts` edit.

## Local schematic anatomy

```
schematics/<name>/
├── schema.json           # {"properties": {"x": {"type": "string", "label": "…", "required": true}}}
├── schema.generated.ts   # pnpm generate:types → NEVER edit
└── factory.ts            # default export: (input: Input) => void | Promise<void>
```

Registered in `project-builder.json` under `collections.default.<name>`.
Factories run as TypeScript directly under Bun — no build step, and
`schematics/` stays OUT of the Nest tsconfigs (`.ts`-extension imports,
`bun:test` types).

**`label` is REQUIRED on every schema.json property** — codegen fails without it.

## Authoring API (`@pbuilder/sdk/commons`)

Verbs: `create`, `replaceContent`, `remove`, `rename`, `move`, `copy`,
`copyIn`, `scaffold`, `find`. The factory schedules directives; the engine
writes to disk.

- **`create(path, { template, options: {} })` — ALWAYS pass `options: {}`.**
  Omitting it puts `undefined` in the IR batch → rejected as
  `unrepresentable-content` (SDK issue #60).
- `find(path).read()` → branch on `=== undefined` (absent) / `=== ''` (empty)
  — never `if (!content)`.
- Mutate existing TypeScript with the AST dialect, never string surgery:
  `import * as tsd from '@pbuilder/sdk/typescript'` →
  `tsd.find(path).modify((sf) => …)` hands you a ts-morph `SourceFile` and
  preserves the file's own newline convention (CRLF-safe). Gotchas: check
  idempotence BEFORE scheduling (a no-op `.modify()` still commits a write);
  the dialect pins double-quote style — `replaceWithText` the module specifier
  for single-quote repos; walking/parsing raw source needs `ts-morph` as a
  direct devDependency (pin the SDK's own version — pnpm doesn't hoist it).
  For non-TS files only: `find().read()` + `replaceContent(path, next)`.
- Templates are Go-template with `{= .name | pipe =}` delimiters; 7 pipes
  (`upper lower capitalize dasherize underscore camelize classify`), NO
  pluralize, `classify` does NOT singularize. Simplest robust path: build
  final strings in factory TS (no `{= =}` at all) — rendered verbatim.

## Testing factories

`runFactoryForTest(factory, input, { seed })` from `@pbuilder/sdk/testing`,
under `bun test` (`pnpm test:schematics`). In-memory, no engine:
`result.tree` = committed writes ONLY (untouched seeds absent — that's how you
assert idempotence), `result.error` = authoring rejection or factory throw.
Name files `*.test.ts` so Jest ignores them.

## This project's schematics

- `builder execute default:schema --name=<resource>` → mongoose schema skeleton.
- `builder execute default:resource --schema=src/<plural>/schemas/<singular>.schema.ts` → full slice (entity, DTOs, service, repository, resolver, module, unit spec, e2e spec, Bruno, app.module registration). Endpoint workflow + supported field types: see `AGENTS.md`.
- Generator bugs get fixed in `schematics/resource/` and regenerated — never patched in generated files.
