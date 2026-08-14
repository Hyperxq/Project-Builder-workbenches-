All 14 entities from `entities-benchmark.txt` are implemented following the Author reference architecture, and the full DoD passes cleanly:

```
pnpm exec tsc --noEmit  ✓
pnpm lint                ✓ (0 errors)
pnpm test                ✓ (16 suites / 76 tests)
pnpm test:e2e             ✓ (16 suites / 76 tests, against real MongoDB)
```

**What was built**, per entity (Book, Category, Supplier, Warehouse, Employee, Review, Coupon, Invoice, Shipment, Payment, Ticket, Event, Subscription, Vehicle):
- GraphQL resolver, service, repository, module, DTOs (create/get/update), entity, Mongoose schema
- Embedded sub-documents for Warehouse (`location`), Invoice (`billing`), Shipment (`destination`) — each with its own `ObjectType`/`InputType` and a proper nested Mongoose sub-schema (avoiding the `type:`-key ambiguity gotcha)
- Unit tests for the service layer (mocked repository)
- e2e tests driving full CRUD through `/graphql` against a live MongoDB
- A 5-request Bruno collection per entity (`bruno/<entity>/`)
- `app.module.ts` wired up with all 14 new modules

Since this was ~200 near-identical files, I wrote a code generator (not committed) rather than hand-authoring each one, to keep every module byte-for-byte consistent with the Author reference conventions.

**Bug fixed along the way (affected the reference implementation too, not just my additions):** the base `tsconfig.json` had `declaration`/`outDir` set without an explicit `rootDir`, which TypeScript 6.0 flags as ambiguous (`TS5011`) — but only inside ts-jest's per-file compilation, so `pnpm test`/`pnpm test:e2e` failed even for the pre-existing `author.service.spec.ts`, while `tsc --noEmit` and `pnpm lint` looked fine. Root cause verified in ts-jest's `transpileModule` internals. Fixed by adding a dedicated `tsconfig.spec.json` (rootDir `.`) used only by ts-jest, leaving the shared `tsconfig.json`/`tsconfig.build.json` untouched. Also bumped the e2e `testTimeout` to 30s since running 15x more Nest+Mongo e2e suites concurrently occasionally exceeded Jest's 5s default hook timeout under parallel workers (pure resource contention, not a functional bug — confirmed by a clean serial run).
