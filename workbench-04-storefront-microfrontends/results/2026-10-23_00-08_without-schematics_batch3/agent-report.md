The `promotions` slice is in place, and `npm run lint`, `npm run typecheck` and `npm run test` all pass from the root. `npx nx sync:check` reports nothing stale. `package-lock.json` is not updated, so run `npm install` once you have network access.

I couldn't update it because npm can't reach the registry here. To get the new workspaces resolving locally, I added the two symlinks under `node_modules/@storefront` by hand.

I copied the `orders` slice and adapted it, following the README conventions.

- **Contract (`packages/promotions-contract`):**
  - It has `Promotion`, `ValidatePromotionBody`, `PromotionValidation`, `PROMOTIONS_PATTERNS`, `PROMOTIONS_SERVICE` and `PROMOTIONS_SERVICE_DEFAULT_PORT` (4104). Amounts are in cents.
- **Service (`apps/promotions-service`):**
  - It is a TCP-only service with three seed promotions: `WELCOME10`, `SPRING20` and `VIP30`.
  - Codes are matched case-insensitively and the discount rounds down. An unknown code replies `null`.
  - A missing code, or an amount that isn't a non-negative integer, throws `RpcException` with status 400.
- **Gateway (`apps/gateway`):** `GET /api/promotions` and `POST /api/promotions/validate` with `{ code, amount }` forward to the service. An unknown code answers 404 and bad input answers 400. I made the POST return 200 rather than Nest's default 201.
- **Microfrontend (`apps/promotions`, port 3104):** it shows the promotion list and a form to check a code against a dollar amount, using `@storefront/ui`. It is registered in `mf.ts` and rendered in `App.tsx` inside a `ProviderBoundary`.
- **Tests:** a Jest spec for the service handlers and one for the gateway routes. A Vitest spec for the microfrontend covers rendering with the client mocked.
- **Wiring:** the root workspaces and root tsconfig references, the gateway's `ClientsModule` entry, `package.json` and tsconfig references, and the README tables, route notes and serve commands.

Prettier reformatted the README tables when I ran it, so the diff there is larger than the content I added.
