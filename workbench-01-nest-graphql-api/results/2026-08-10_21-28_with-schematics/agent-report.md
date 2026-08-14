All 14 GraphQL CRUD endpoints are generated and green across `tsc`, `lint`, `test`, and `test:e2e` (16 suites, 76 tests total). Summary:

**Entities generated**: Book, Category, Supplier, Warehouse, Employee, Review, Coupon, Invoice, Shipment, Payment, Ticket, Event, Subscription, Vehicle — each with schema, entity, DTOs, repository, service, resolver, module, unit spec, e2e spec, and Bruno collection, following the same architecture as the reference Author slice. Warehouse/Invoice/Shipment include their embedded sub-documents (location/billing/destination).

**Bugs found and fixed along the way** (all outside the scope of hand-editing generated output, per AGENTS.md rules):
1. `tsconfig.json` was missing an explicit `rootDir`, which broke `ts-jest` under the repo's TS6 native compiler — added `rootDir: "."`. This was a pre-existing baseline issue (it broke the Author reference tests too), not something my changes introduced.
2. The `resource` schematic's templates omitted definite-assignment assertions (`!`) on required entity/DTO fields, causing `strictPropertyInitialization` errors — fixed `schematics/resource/templates.ts` and updated the schematic's own test assertions (`pnpm test:schematics` still green).

I did not touch `schematics/resource/factory.ts`'s missing `force: true` on `create()` — adding it actually crashes the installed native engine (a real SDK/engine version mismatch), so I worked around it by regenerating cleanly instead of patching that path.
