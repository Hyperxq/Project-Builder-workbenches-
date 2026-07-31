# nest-graphql-api

A NestJS 11 GraphQL API over MongoDB where **endpoints are generated, not handwritten**.

Every resource in this project — 17 of them, from `customers` to `vehicles` — was produced by two local [Project Builder](https://github.com/Project-Builder-Schematics) schematics. You write a Mongoose schema; one command derives the entity, DTOs (with validation), repository, service, resolver, module, unit spec, e2e spec, and a [Bruno](https://www.usebruno.com/) API collection, and registers the module in the app. The schema file is the single source of truth.

**Stack**: NestJS 11 · code-first GraphQL (Apollo Server 5, Express 5) · Mongoose 9 · `@nestjs/config` + Joi · Jest · Bruno · [Project Builder](https://github.com/Project-Builder-Schematics) (`builder` CLI + [`@pbuilder/sdk`](https://www.npmjs.com/package/@pbuilder/sdk))

## Requirements

- Node.js 20+ and [pnpm](https://pnpm.io/)
- Docker (for MongoDB)
- [Bun](https://bun.sh) — runs the schematics and their tests
- Project Builder CLI — only needed to *generate* endpoints, not to run the app:

  ```bash
  brew install project-builder-schematics/tap/pbuilder
  # installs the `builder` binary; schematics execute through a Bun sidecar
  ```

The schematics authoring library, [`@pbuilder/sdk`](https://www.npmjs.com/package/@pbuilder/sdk), is a regular dev dependency — `pnpm install` brings it in, nothing to set up.

## Getting started

```bash
pnpm install
cp .env.example .env        # local defaults work out of the box
docker compose up -d mongodb
pnpm start:dev
```

GraphQL is served at `http://localhost:3000/graphql` (interactive explorer included). Try the health query:

```graphql
query {
  health
}
```

To run the whole stack (API + MongoDB) in containers instead: `docker compose up`.

## Generating a new endpoint

Endpoints are generated, never handwritten. The workflow has four steps:

**1. Scaffold the schema** (singular or plural name — the generator inflects both):

```bash
builder execute default:schema --name=books
# → src/books/schemas/book.schema.ts
```

**2. Fill in the schema.** This file is the contract. Flat options only:

```ts
BookSchema.add({
  isbn: { type: String, required: true, unique: true }, // unique ⇒ lookup key
  title: { type: String, required: true },
  pages: { type: Number, required: true },
  inPrint: { type: Boolean, required: true, default: true },
  publishedAt: { type: Date, required: false },
});
```

Supported types: `String`, `Number`, `Boolean`, `Date`, or an imported `<Name>Schema` for embedded sub-documents (same `schemas/` folder, relative import). Semantics: `unique: true` fields become the `Get<X>Input` lookup keys, fields with a `default` are optional on create, and embedded sub-documents are replaced whole on update.

**3. Generate the resource:**

```bash
builder execute default:resource --schema=src/books/schemas/book.schema.ts
```

One shot: entity, DTOs with the correct class-validator decorators (including nested `@ValidateNested`/`@Type`), repository, service, resolver, module, unit spec, e2e spec, Bruno collection (`bruno/books/`), nested classes for sub-schemas, and idempotent registration in `src/app.module.ts`.

**4. Verify** — an endpoint is not done until all four pass:

```bash
docker compose up -d mongodb
pnpm exec tsc --noEmit && pnpm lint && pnpm test && pnpm test:e2e
```

If the schematic can't express what you need (ObjectId relations between resources, custom resolver logic), generate the closest resource first and edit the generated code — `src/customers/` is the canonical reference slice. If the generator itself has a bug, fix the schematic in `schematics/resource/` and regenerate; never patch generated files by hand.

## Architecture

The codebase is vertical resource slices over a small shared kernel. Every resource owns one folder under `src/` and crosses the same four layers:

```
src/
├── app.module.ts            # composition root: Config, GraphQL, Database, resources
├── app.resolver.ts          # health query
├── common/                  # shared kernel (@app/common)
│   ├── database/            # AbstractRepository + MongooseModule wiring
│   └── decorators/          # @TryAndCatch()
└── <resource>/              # e.g. customers/
    ├── schemas/<singular>.schema.ts   # persistence: Mongoose schema (SOURCE OF TRUTH)
    ├── entities/<singular>.entity.ts  # contract: GraphQL @ObjectType
    ├── dto/*.input.dto.ts             # contract: GraphQL @InputType + validation
    ├── <singular>.repository.ts       # persistence access
    ├── <singular>.service.ts          # application logic
    ├── <singular>.resolver.ts         # transport (GraphQL)
    └── <plural>.module.ts             # composition of the slice
```

| Layer | Responsibility |
|---|---|
| Resolvers | GraphQL transport only — receive validated DTOs, delegate to the service, wrapped in `@TryAndCatch()` |
| Services | Orchestrate the use case; anything that can miss returns `Promise<Entity \| null>` |
| Repositories | Extend `AbstractRepository<TDocument>` (lean reads, `returnDocument: 'after'`, strips `undefined` from filters) |
| Entities + DTOs | `@ObjectType` / `@InputType` classes; `src/schema.gql` is generated from them — never edit it |

Validation is global (`ValidationPipe({ whitelist: true, transform: true })`): every DTO field needs a class-validator decorator or the whitelist strips it silently. The generated DTOs already comply.

## Testing

```bash
pnpm test              # unit tests (Jest)
pnpm test:e2e          # e2e tests (needs MongoDB running)
pnpm test:cov          # coverage
pnpm test:schematics   # schematic factory tests (Bun)
```

## API client collection

A ready-to-use [Bruno](https://www.usebruno.com/) collection lives in `bruno/` — one folder per resource with create/get/list/update/remove requests, plus environments for local use. Open the folder in Bruno and pick the `local` environment.

## Schematics

The generators live in `schematics/` (`schema`, `resource`, plus shared naming helpers) and are registered in `project-builder.json`. They are written in TypeScript against [`@pbuilder/sdk`](https://www.npmjs.com/package/@pbuilder/sdk), run directly under Bun (no build step), and stay out of the Nest tsconfigs.

Editing a generator:

```bash
pnpm generate:types     # regenerate schema.generated.ts from schema.json
pnpm test:schematics    # factory tests run in-memory, no engine needed
```

For the full authoring reference (verbs, gotchas, testing harness), see [`AGENTS.md`](./AGENTS.md) and the Project Builder skill at `.claude/skills/pbuilder/SKILL.md`.
