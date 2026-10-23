The `promotions` slice is in place, and `npm run lint`, `npm run typecheck` and `npm run test` all pass from the repo root. `nx sync:check` reports nothing stale. I didn't commit, and I didn't start the services or the shell, so the TCP wiring and the federation load haven't been run live.

I copied the `orders` projects and renamed them instead of running the Nx generators. That gives the same shape the README describes.

- **Contract** (`packages/promotions-contract`): `Promotion` and `PromotionValidation` types, the validate payload, `PROMOTIONS_PATTERNS`, the `PROMOTIONS_SERVICE` token and default port 4104.
- **Service** (`apps/promotions-service`):
  - Three seed promotions: `WELCOME10`, `SPRING25` and `VIP50`.
  - `list` returns them, and `validate` returns the discount, rounded to the nearest cent, and the amount after it.
  - Codes match case-insensitively, and an unknown code replies `null`.
  - A missing code or an amount that isn't a non-negative integer throws `RpcException` with status 400.
- **Gateway** (`apps/gateway`): `GET /api/promotions` lists them. `POST /api/promotions/validate` takes `{ code, amount }` with the amount in cents. It answers 400 for bad input and 404 for an unknown code. The client is registered in `AppModule` with `PROMOTIONS_SERVICE_HOST` and `PROMOTIONS_SERVICE_PORT`.
- **Microfrontend** (`apps/promotions`, port 3104): it lists the promotions and has a small form to check a code against a dollar amount. It uses `@storefront/ui` components and is registered in the shell's `PROVIDERS` and `App.tsx`.
- **Tests**: the service handlers, the gateway routes, and the microfrontend rendering with the client mocked.
- **Workspace and docs**: the new service is added to `workspaces`, and the root `tsconfig.json` and the gateway's `tsconfig.app.json` have their project references. The README layout table, the promotions routes note and the serve commands are updated.

I picked `POST /promotions/validate` with a JSON body over a query string so the amount stays a number rather than a string.
