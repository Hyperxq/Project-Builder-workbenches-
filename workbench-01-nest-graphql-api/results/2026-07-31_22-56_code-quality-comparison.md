# Code Quality Comparison — with-schematics vs without-schematics (2026-07-31 22:56)

Benchmark: `entities-benchmark.txt` — 14 new entities (Author pre-existing as reference), each requiring a full GraphQL CRUD endpoint, service unit tests, e2e CRUD cycle through `/graphql`, and a Bruno collection. Both arms were reviewed independently by two agents applying the same rubric (deep read of books/invoices/payments/subscriptions, consistency skim of the rest, e2e + schema + shared infra review, spec-compliance audit).

> Scores come from two independent reviewers, so a ±1 difference between arms on the same dimension is within judge noise. The concrete findings below each score are the real evidence.

## Metrics

| Metric | with-schematics | without-schematics |
|---|---|---|
| Module LOC (incl. service unit spec) | ~350 avg/module (4,898 total for 14 modules) | ~731 avg/module (~520 excl. unit spec) |
| Files per module | resolver, service, service.spec, repository, module, entity, schema, DTOs | 9 (same shape) |
| schema.gql | 679 lines, sorted | 680 lines, sorted |
| e2e specs | 14 files, ~141 lines each, 13 `expect()` per resource | 16 files, 2,200 lines, 13 `expect()` per resource |
| Unit specs | 14 × `*.service.spec.ts`, 5 tests each | 15 × `*.service.spec.ts`, 2,374 lines |
| Bruno collections | 14 × 5 requests | 15 × 5 requests |
| `any` in production src | 0 | 0 |

Headline: **with-schematics delivers the same functionality in roughly half the code per module.**

## Per-dimension scores

| Dimension | with-schematics | without-schematics |
|---|---|---|
| Architecture & layering | 8 | 9 |
| DTO & validation | 7 | 7 |
| GraphQL schema design | 6 | 7 |
| Error handling | 3 | 4 |
| Type safety | 8 | 8 |
| Consistency (14 modules) | 9 | 9 |
| Test quality | 5 | 6 |
| Code economy | 7 | 7 |
| **Spec compliance** | **9** | **9** |

## Spec compliance (vs entities-benchmark.txt)

Both arms passed the full audit:

- **Field fidelity**: all 14 entities match the spec name-for-name and type-for-type; no missing, renamed, or extra fields; no `_id`/timestamps leaked into the API.
- **Unique lookup keys**: every `GetXInput` exposes exactly the spec's unique key(s); entities with two uniques (Employee, Supplier, Author) expose both. No Mongo `_id` fallback anywhere.
- **Defaults**: all defaulted fields (`inPrint: true`, `renewals: 0`, etc.) are optional on create and defaulted in the mongoose schema — verified in all 14 modules of both arms.
- **Optionals**: every spec-optional field is nullable in entity + SDL in both arms.
- **Embedded objects**: `Warehouse.location`, `Invoice.billing`, `Shipment.destination` are real sub-document schemas with proper typed GraphQL object/input types and exact sub-fields in both arms — not JSON scalars, not flattened.
- **Deliverables**: 14/14 complete in both arms — unit specs, e2e cycles, Bruno collections. Nothing missing.

**One real fidelity defect, only in with-schematics**: `Warehouse.location.latitude/longitude` typed as `Int!` with `@IsInt` (`with-schematics/src/warehouses/entities/location.entity.ts:12-19`, `schema.gql:274-275`) — real coordinates like `41.39` are rejected. without-schematics correctly used `Float`.

## Shared strengths (both arms)

1. Clean Resolver → Service → Repository layering over a shared generic `AbstractRepository`, with the documented mongoose-9 `omitUndefined` workaround (`src/common/database/abstract.repository.ts:13-19`) — zero per-module query code.
2. Near-perfect spec fidelity: 42 fields, 18 unique keys, 14 defaults, 3 embedded sub-documents.
3. Behavioral e2e assertions: full-payload `toEqual`, default application verified on create, persistence re-read after update, list-empty after remove — not just status codes.
4. Real validation pipeline: global `ValidationPipe({whitelist, transform})` mirrored into the e2e bootstrap, so the tested contract equals production.
5. Machine-grade consistency: 14 modules are structural clones, with multi-key lookup divergence appearing only where the spec demands it.
6. Zero `any` in production src; explicit return types everywhere.

## Shared weaknesses (both arms — inherited from the project conventions, not the generation method)

1. **No domain error handling at all**: zero `NotFoundException` in either src tree. A miss returns `null` into a non-null SDL field (`book(...): Book!`) → clients get `"Cannot return null for non-nullable field"` as `INTERNAL_SERVER_ERROR`. Duplicate unique keys leak raw Mongo `E11000`.
2. **Zero negative-path test coverage**: across all e2e and unit specs of both arms there is not one not-found, validation-failure, or duplicate-key test; `errors` is only ever asserted `toBeUndefined()`.
3. **No value constraints beyond type**: no `@Min/@Max/@MinLength/@IsPositive` anywhere — `pages: -5`, `rating: 99`, `discount: -1` all pass validation.
4. **Pass-through service layer**: every service is a 5-method delegation to the repository adding no behavior, and its unit tests only re-assert that delegation (~2,400 lines per arm testing wiring).
5. `@TryAndCatch()` is a log-and-rethrow no-op repeated on every resolver method (75×) where one global exception filter would do.
6. `type Subscription` squats GraphQL's reserved subscription root name — safe only while no root subscription exists.
7. No pagination on any list query; the `gql` e2e helper + response interface is copy-pasted into every spec file (~40 lines × 14-16).

## Arm-specific findings

### with-schematics
- **latitude/longitude as `Int`** — the one real data bug of the benchmark (see spec compliance above).
- All-optional lookup inputs with no at-least-one-key guard: `book(getBook: {})` matches an arbitrary document and `removeBook(getBook: {})` deletes an arbitrary one (`src/books/dto/get-book.input.dto.ts:5-10`). Confirmed here; likely shared by the sibling arm (same repository pattern) but not verified there.
- Minor noise: `connection` injected into `AbstractRepository` but never used; every repo redundantly shadows the inherited `model`; odd two-step `new Schema({}) … Schema.add({...})` pattern.

### without-schematics
- Coordinates correctly `Float`; no field-typing defects found.
- `QueryResponse<T>` alias adds nothing over `T | null`; generics in the repository enforced via `as unknown as` casts rather than constraints (also present in the sibling arm).
- Roughly 2× the code per module for the same behavior — more surface to maintain with no additional capability found in review.

## Verdict

**Effectively a tie on quality and spec compliance — the differentiators are economy vs. correctness.**

- **with-schematics** wins on **code economy**: ~half the LOC per module for identical functionality and deliverables, with the same architecture. It loses on **correctness** with one genuine spec-fidelity bug (Int coordinates) that would break the Warehouse entity for real data.
- **without-schematics** wins on **correctness** (no field-typing defects) and edges slightly ahead on schema/error-handling polish, at the cost of ~2× the code volume.

The most important signal of the benchmark is what **both** arms got wrong identically: no not-found semantics, no negative-path tests, no value constraints. Those gaps trace to the shared reference implementation (Author) and project conventions — both generators faithfully replicated the template, including its blind spots. Fixing the template (error mapping via a global filter, one negative e2e per resource, `@Min/@Max` constraints) would lift both arms more than switching generation method.
