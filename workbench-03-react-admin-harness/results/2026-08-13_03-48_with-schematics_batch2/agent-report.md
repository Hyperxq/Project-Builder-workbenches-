Batch 2 is complete and closed out.

## What was delivered

**Three full CRUD modules** — Supplier [T1], Coupon [T2], Warehouse [T2] — each with mock domain (24-row fixture + handler factory + mock-infra spec), the four feature layers, four routes, sidebar entry, overview card, two section tests, and an e2e spec with an axe scan.

**Quirks, implemented and tested:**
- **Coupon (a)** create-only future-date rule — `couponCreateSchema` refines `couponUpsertSchema` with `path: ['expiresAt']`, so it surfaces as a *field error*, never a toast; the form picks the schema from the `coupon` prop it already has. The mock mirrors the asymmetry: the check lives in POST only, so editing an expired coupon stays legal.
- **Coupon (b)** derived Status — `couponStatus()` in the domain (expiry beats the `active` flag), rendered by `CouponStatusBadge`.
- **Coupon (c)** `?status=all|active|expired` — URL-driven via the generated `extraSearch` param, applied *by the list endpoint* before pagination; first wiring of the shadcn `Select`.
- **Warehouse (a)** embedded `location` — first nested Zod object in the tree, rendered as a `FieldSet`/`FieldLegend` group with per-nested-field errors; the mock validates into the object and returns nested-field messages.
- **Warehouse (b)** City column from `location.city`, which `q` also searches.

## Process

`plans/batch-2.md` was written first (modules, scout pattern inventory, schematic decisions, delegation and verification plans). The skeletons came from three standalone `builder execute default:crud-module` runs — no schematic needed changing; Coupon's filter rode the existing `extraSearch` variation point. Two new mechanisms (embedded fieldset, enum Select filter) were built by hand as first instances and declared the rule, per the crystallization directive. One shared extraction: `mocks/core/list-query.ts`, with all seven mock domains now on it.

## Gates (foreground, one chain)

| Gate | Result |
|---|---|
| `pnpm typecheck` | ✅ exit 0 |
| `pnpm lint` | ✅ exit 0 |
| `pnpm test:run` | ✅ 23 files / 160 tests (was 14 / 88) |
| `pnpm test:e2e` | ✅ 52 passed (was 29) |
| `pnpm test:schematics` | ✅ 28 tests / 8 files |

Two failures came up during VERIFY and were fixed: a missing `await` on a post-update assertion in `coupon-form.test.tsx`, and a Playwright strict-mode collision where `getByLabel('City')` also matched **Capa*city*** in `e2e/warehouses.spec.ts`.
