The `reviews` slice is in place, and `npm run lint`, `npm run typecheck` and `npm run test` all pass from the repo root. `nx sync:check` is clean and nothing is committed.

I did not run the Nx generators. I copied the `orders` projects and renamed them, so the config files, the `typecheck` target and the tags carry over from there.

- **Contract (`packages/reviews-contract`):** `Review`, `ProductReviews`, the add and list payloads, `REVIEWS_PATTERNS`, the `REVIEWS_SERVICE` token and the default port 4104.
- **Service (`apps/reviews-service`):** a TCP microservice that keeps reviews in memory, keyed by product id. It lists reviews newest first with the average rating rounded to one decimal, or `null` when there are none. Adding a review rejects a blank product id, author or comment, or a rating that isn't an integer from 1 to 5, with `RpcException({ statusCode: 400, message })`.
- **Gateway:** `GET /api/reviews/:productId` and `POST /api/reviews/:productId` forward to the service. The `ClientsModule` client reads `REVIEWS_SERVICE_HOST` and `REVIEWS_SERVICE_PORT`. Listing never 404s: a product with no reviews returns an empty list.
- **Microfrontend (`apps/reviews`, port 3104):** you type a product id, see the reviews and average rating, and add a review. It uses components from `@storefront/ui`. The shell loads it through `PROVIDERS` in `mf.ts` and a `ProviderBoundary` in `App.tsx`.
- **Tests:** controller specs for the service and the gateway, and a component spec for the microfrontend with the client mocked.
- **Wiring:** root `workspaces`, root `tsconfig.json` references, the gateway's `package.json` and `tsconfig.app.json`, and the README (project table, serve commands and a reviews note).

`npm install --offline` failed because the registry wasn't cached, so I symlinked `@storefront/reviews-contract` and `@storefront/reviews-service` into `node_modules` by hand. `package-lock.json` is not updated. Run `npm install` once with network access to refresh it.
