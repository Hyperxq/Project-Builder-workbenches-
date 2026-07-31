NestJS 11 GraphQL API backed by MongoDB. Code-first GraphQL (Apollo Server 5,
Express 5), Mongoose 9, configuration via `@nestjs/config` validated with Joi.
Package manager: pnpm. Tests: Jest (unit + e2e). API client collection: Bruno
(`bruno/`).

## Rules
- DON'T use engram
- Only use this repo don't go outside

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
    ├── schemas/<singular>.schema.ts     # 4. persistence: Mongoose schema
    ├── entities/<singular>.entity.ts    # 1. contract: GraphQL @ObjectType
    ├── dto/*.input.dto.ts               # 1. contract: GraphQL @InputType + validation
    ├── <singular>.repository.ts         # 3. persistence access
    ├── <singular>.service.ts            # 2. application logic
    ├── <singular>.resolver.ts           # 1. transport (GraphQL)
    └── <plural>.module.ts               # composition of the slice
```

### Layer responsibilities

1. **Transport (resolvers)** — GraphQL queries/mutations only. Resolvers are
   thin: they receive validated DTOs and delegate to the service. Every
   resolver method is decorated with `@TryAndCatch()` (logs and rethrows so
   errors keep their GraphQL shape). No business logic, no data access here.

2. **Application (services)** — orchestrate the use case and talk to the
   repository. Services return `Promise<Entity>` or `Promise<Entity | null>`
   honestly: anything that can miss returns `| null`, never a lie.

3. **Persistence (repositories)** — every repository extends
   `AbstractRepository<TDocument>` from `@app/common`, which provides
   `create` / `findOne` / `findMany` / `update` / `remove` with lean reads,
   `returnDocument: 'after'` updates, and filter sanitization (it strips
   `undefined` values — Mongoose 9 would otherwise match them as `null`).
   Repositories only add the model injection; behavior lives in the base.

4. **Contracts (entities + DTOs)** — entities are `@ObjectType` classes;
   inputs are `@InputType` classes. The GraphQL schema is generated from these
   (`src/schema.gql`, code-first, sorted — never edit it by hand).

**Composition** — each resource module wires resolver + service + repository
and registers its Mongoose schema via `MongooseModule.forFeature` (collection
name = plural camelCase). `AppModule` imports `ConfigModule` (global, Joi
validation of `MONGODB_URI` and `MONGO_DATABASE`), `GraphQLModule`
(ApolloDriver, `autoSchemaFile`), `DatabaseModule`, and every resource module.

### Validation pipeline (load-bearing)

`main.ts` installs `ValidationPipe({ whitelist: true, transform: true })`
globally. Consequences you must respect:

- **Every DTO field needs a class-validator decorator** — whitelist strips
  undecorated properties silently.
- **Nested input objects need `@ValidateNested()` + `@Type(() => X)`** on the
  containing field, or whitelist strips the whole nested object.
- e2e tests must install the same pipe on the testing app, otherwise they test
  a different pipeline than production.

### Cross-cutting conventions

- Path alias `@app/common` → `src/common` (tsconfig `paths`; Jest needs the
  mirror `moduleNameMapper` in both jest configs — already wired).
- Naming: folder = plural dashed; files = singular dashed; classes =
  `Customer`, `CustomerService`, `CustomersModule`; GraphQL operations =
  `createCustomer` / `customers` / `customer` / `updateCustomer` /
  `removeCustomer`.
- Update semantics: `Update<X>Args = { query: Get<X>Input, payload }`;
  embedded sub-documents are replaced whole.
- Environment: `.env` (gitignored) ↔ `.env.example` (committed). MongoDB runs
  via `docker compose up -d mongodb`.

## How to create a new endpoint (resource)

Example: resource `books` (entity `Book`). Use `src/customers/` as the
canonical reference implementation for every file below.

1. **Mongoose schema** — `src/books/schemas/book.schema.ts`:

   ```ts
   import * as mongoose from 'mongoose';

   export const BookSchema = new mongoose.Schema({}, { versionKey: false });

   BookSchema.add({
     isbn: { type: String, required: true, unique: true },
     title: { type: String, required: true },
     pages: { type: Number, required: true },
   });
   ```

2. **Entity** — `src/books/entities/book.entity.ts`: `@ObjectType()` class with
   one `@Field` + one class-validator decorator per schema field. Fields that
   are neither required nor defaulted are nullable (`{ nullable: true }`,
   `@IsOptional()`, `?:`).

3. **DTOs** — `src/books/dto/`:
   - `create-book.input.dto.ts` — `CreateBookInput`: required fields required;
     defaulted fields optional.
   - `get-book.input.dto.ts` — `GetBookInput`: the unique/lookup fields, all
     optional.
   - `update-book.input.dto.ts` — `UpdateBookPayload` (everything optional) and
     `UpdateBookArgs { query: GetBookInput; payload: UpdateBookPayload }`, both
     nested fields with `@ValidateNested()` + `@Type(...)`.

4. **Repository** — `src/books/book.repository.ts`: extend
   `AbstractRepository<Book>`, inject the model and connection, call `super`.
   Nothing else.

5. **Service** — `src/books/book.service.ts`: `create`, `findAll`, `findOne`,
   `update` (`{ upsert: false }`), `remove`, delegating to the repository with
   honest `| null` return types.

6. **Resolver** — `src/books/book.resolver.ts`: five operations
   (`createBook`, `books`, `book`, `updateBook`, `removeBook`), each decorated
   with `@TryAndCatch()`, each delegating to the service.

7. **Module** — `src/books/books.module.ts`: providers = resolver + service +
   repository; imports = `DatabaseModule` +
   `MongooseModule.forFeature([{ name: Book.name, schema: BookSchema,
   collection: 'books' }])`.

8. **Register** — add `BooksModule` to the `imports` array in
   `src/app.module.ts`.

9. **Unit spec** — `src/books/book.service.spec.ts`: service with the
   repository mocked (`useValue` with `jest.fn()` per method); assert
   delegation and return values.

10. **e2e spec** — `test/books.e2e-spec.ts`: boot `AppModule`, install the
    same global `ValidationPipe`, clean the `books` collection before/after,
    and drive the full CRUD cycle through `POST /graphql`: create → list →
    get by key → update (assert the change PERSISTED with a follow-up read,
    not just the mutation response) → remove → assert empty list.

11. **Bruno** — `bruno/books/*.bru`: one request per operation
    (create/list/get/update/remove) with sample variables, pointing at
    `{{baseUrl}}/graphql`.

Verify before considering the endpoint done:

```bash
docker compose up -d mongodb
pnpm exec tsc --noEmit && pnpm lint && pnpm test && pnpm test:e2e
```

All four must pass. An endpoint without a green e2e run is not finished.