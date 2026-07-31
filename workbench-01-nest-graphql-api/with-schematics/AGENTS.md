# AGENTS.md — nest-graphql-api

NestJS 11 GraphQL API backed by MongoDB. Code-first GraphQL (Apollo Server 5,
Express 5), Mongoose 9, configuration via `@nestjs/config` validated with Joi.
Package manager: pnpm. Tests: Jest (unit + e2e). API client collection: Bruno
(`bruno/`).

## Architecture

The codebase is organized as vertical resource slices over a small shared
kernel. Every resource (e.g. `customers`, `products`, `orders`) owns one folder
under `src/` and crosses the same four layers:

```
src/
├── app.module.ts            # composition root: Config, GraphQL, Database, resources
├── app.resolver.ts          # health query (GraphQL requires ≥1 query to boot)
├── common/                  # shared kernel (@app/common path alias)
│   ├── database/
│   │   ├── abstract.repository.ts   # generic Mongo repository base
│   │   └── database.module.ts       # MongooseModule.forRootAsync wiring
│   └── decorators/
│       └── try-and-catch.decorator.ts
└── <resource>/              # one folder per resource, plural, e.g. customers/
    ├── schemas/<singular>.schema.ts     # persistence: Mongoose schema (SOURCE OF TRUTH)
    ├── entities/<singular>.entity.ts    # contract: GraphQL @ObjectType
    ├── dto/*.input.dto.ts               # contract: GraphQL @InputType + validation
    ├── <singular>.repository.ts         # persistence access
    ├── <singular>.service.ts            # application logic
    ├── <singular>.resolver.ts           # transport (GraphQL)
    └── <plural>.module.ts               # composition of the slice
```

### Layer responsibilities

1. **Transport (resolvers)** — GraphQL queries/mutations only. Thin: receive
   validated DTOs, delegate to the service. Every method is decorated with
   `@TryAndCatch()`. No business logic, no data access.
2. **Application (services)** — orchestrate the use case, talk to the
   repository. Anything that can miss returns `Promise<Entity | null>`.
3. **Persistence (repositories)** — extend `AbstractRepository<TDocument>`
   from `@app/common` (lean reads, `returnDocument: 'after'`, strips
   `undefined` from filters — Mongoose 9 would match them as `null`).
   Repositories only add model injection.
4. **Contracts (entities + DTOs)** — `@ObjectType` / `@InputType` classes. The
   GraphQL schema (`src/schema.gql`) is generated from these — never edit it.

**Composition** — each resource module wires resolver + service + repository +
`MongooseModule.forFeature` (collection = plural camelCase). `AppModule`
imports Config (global, Joi), GraphQL (ApolloDriver, autoSchemaFile),
`DatabaseModule`, and every resource module.

### Validation pipeline (load-bearing)

`main.ts` installs `ValidationPipe({ whitelist: true, transform: true })`
globally:

- Every DTO field needs a class-validator decorator — whitelist strips
  undecorated properties silently.
- Nested input objects need `@ValidateNested()` + `@Type(() => X)` on the
  containing field.
- e2e tests must install the same pipe on the testing app.

## How to create a new endpoint — USE THE SCHEMATICS

Endpoints are generated, not handwritten. The Mongoose schema file is the
single source of truth; two local schematics (Project Builder, `schematics/`)
derive everything else from it and enforce this architecture.

### Workflow

1. **Generate the schema skeleton** (resource name singular or plural — the
   generator inflects both):

   ```bash
   builder execute default:schema --name=books
   # → src/books/schemas/book.schema.ts
   ```

2. **Fill the schema** — this file is the contract. Supported field shape
   (flat options only):

   ```ts
   BookSchema.add({
     isbn: { type: String, required: true, unique: true },   // unique ⇒ lookup key
     title: { type: String, required: true },
     pages: { type: Number, required: true },
     inPrint: { type: Boolean, required: true, default: true },
     publishedAt: { type: Date, required: false },
   });
   ```

   Supported types: `String`, `Number`, `Boolean`, `Date`, or an imported
   `<Name>Schema` for embedded sub-documents. Sub-schema files live in the
   same `schemas/` folder and are imported relatively:

   ```ts
   import { AuthorSchema } from './author.schema';
   // ...
   author: { type: AuthorSchema, required: true },
   ```

   Semantics the generator applies: `unique: true` fields become the
   `Get<X>Input` lookup keys; fields with `default` are optional on create;
   embedded sub-documents are replaced whole on update.

3. **Generate the resource**:

   ```bash
   builder execute default:resource --schema=src/books/schemas/book.schema.ts
   ```

   This generates the full slice in one shot — entity, DTOs (with the correct
   validation decorators, including nested `@ValidateNested`/`@Type`),
   repository, service, resolver, module, **unit spec**, **e2e spec**, the
   **Bruno collection** (`bruno/books/`), nested entity/input classes for any
   sub-schema, and registers the module in `src/app.module.ts` (idempotent).

4. **Verify** — an endpoint is not done until all four pass:

   ```bash
   docker compose up -d mongodb
   pnpm exec tsc --noEmit && pnpm lint && pnpm test && pnpm test:e2e
   ```

### Rules

- **Do NOT handwrite a resource slice** while the schematic covers the case.
  If the schematic cannot express what you need (e.g. ObjectId relations
  between resources, custom resolver logic), generate the closest resource
  first, then edit the generated code — and respect the validation-pipeline
  rules above when you do. `src/customers/` is the canonical reference slice.
- **Do not edit generated files to fix generator bugs** — fix the schematic
  (`schematics/resource/`) and regenerate; its tests run with
  `pnpm test:schematics`.
- The schematics run under Bun and are excluded from the Nest tsconfigs —
  never add `schematics/` to the app build, and never import from
  `schematics/` in `src/`.
- Schematic authoring gotcha: `create(path, { template })` must always pass
  `options: {}` (omitting it puts `undefined` in the IR batch and the write is
  rejected as unrepresentable).

## Environment

- `.env` (gitignored) ↔ `.env.example` (committed): `MONGODB_URI`,
  `MONGO_DATABASE`, `MONGO_ROOT_USER`, `MONGO_ROOT_PASS`, `MONGO_PORT`.
- MongoDB: `docker compose up -d mongodb`. Dev server: `pnpm start:dev`
  (GraphQL at `http://localhost:3000/graphql`).
- Project Builder CLI (`builder`, published):
  `brew install project-builder-schematics/tap/pbuilder` — schematics run
  through a Bun sidecar, so [Bun](https://bun.sh) must be installed. The SDK
  (`@pbuilder/sdk`) is a published npm dev dependency; `pnpm install` covers it.

<!-- pbuilder:skill:begin -->
## Project Builder Skill

This project uses [Project Builder](https://github.com/Project-Builder-Schematics/project-builder-cli).
Load the skill at `.claude/skills/pbuilder/SKILL.md` for command reference and authoring heuristics.
<!-- pbuilder:skill:end -->
