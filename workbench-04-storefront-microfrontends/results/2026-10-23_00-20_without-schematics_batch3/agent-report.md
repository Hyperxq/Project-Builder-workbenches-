The `promotions` slice is in place, and `npm run lint`, `npm run typecheck` and `npm run test` all pass from the root. `nx sync` reports the workspace is up to date. I didn't commit.

I copied the `orders` slice and renamed it rather than running the Nx generators. That way the README's by-hand steps are already done: config files, port, no e2e project, contract settings, workspaces and references.

- **Contract (`packages/promotions-contract`):** it has `Promotion` (code, description, percentOff) and `PromotionValidation` (code, percentOff, discount, total). Amounts are integers in cents. It also holds the `PROMOTIONS_PATTERNS`, the `PROMOTIONS_SERVICE` token and the default port 4104.
- **Service (`apps/promotions-service`):** a TCP-only microservice on port 4104, reading `PROMOTIONS_SERVICE_PORT`. It holds three seed promotions in memory: `WELCOME10`, `SPRING20` and `VIP30`. Codes match ignoring case and surrounding spaces. An unknown code replies `null`, and a bad code or amount throws `RpcException` with status 400.
- **Gateway:**
  - `GET /api/promotions` lists the promotions.
  - `POST /api/promotions/validate` with `{ code, amount }` validates a code. I chose POST with a JSON body because the contract carries both values; say if you'd rather have a GET with a query string.
  - An unknown code answers 404, and the existing `RpcErrorFilter` turns the service's 400 into an HTTP 400.
  - The client is registered in `ClientsModule`, and the contract is added to the gateway's `package.json` and `tsconfig.app.json`.
- **Microfrontend (`apps/promotions`):** port 3104, federation name `promotions`, registered in `PROVIDERS` and rendered in a `ProviderBoundary` in the shell. It lists the promotions and has a form that checks a code against an amount in dollars, using `@storefront/ui` components.
- **Tests:**
  - The service tests cover the handlers, validation and patterns.
  - The gateway tests cover forwarding and the 404.
  - The microfrontend tests mock the client and cover the list, the empty state, the load error, a successful check and an unknown code.
- **Docs and wiring:** the README layout and command tables and the gateway notes are updated. The root `tsconfig.json` references and the root `workspaces` entry are added.

`npm install --offline` failed because the registry cache has no copy of some packages. I created the two `node_modules/@storefront` symlinks (`promotions-contract`, `promotions-service`) by hand, and `package-lock.json` is not updated. Run `npm install` with network access to refresh it.
