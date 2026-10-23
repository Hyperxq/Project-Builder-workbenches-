The `reviews` slice is in, and `npm run lint`, `npm run typecheck` and `npm run test` all pass from the root. `npx nx sync:check` reports the references are up to date, and I haven't committed anything. I haven't run the services or the microfrontend, so the TCP wiring and the shell rendering are untested outside the unit tests.

I copied the `orders` projects and renamed them rather than running the Nx generators. The result follows the same shape as the other features.

- **Contract:** `packages/reviews-contract` holds the `Review` and `ProductReviews` types, the request payloads and `REVIEWS_PATTERNS`. It also holds the `REVIEWS_SERVICE` token and the default port, 4104.
- **Service:** `apps/reviews-service` is a TCP-only NestJS app that keeps reviews in memory by product id and lists them newest first. It rejects a missing product id, a blank author name or comment, and a rating that isn't an integer from 1 to 5. Each rejection is a 400 `RpcException`. The average rating is rounded to one decimal and is `null` when there are no reviews. Listing an unreviewed product returns an empty list rather than a 404.
- **Gateway:** `GET /api/reviews/:productId` and `POST /api/reviews/:productId` forward to the service. The module also registers the new client.
- **Microfrontend:** `apps/reviews` runs on port 3104 and is registered in the shell's `mf.ts` and `App.tsx`. You type a product id, see its reviews and average, and add a review through a form. It uses the `@storefront/ui` components.
- **Tests:** the service handlers, the gateway routes and the microfrontend rendering each have a spec, and the microfrontend spec mocks the client.
- **Workspace wiring:** the root `package.json` workspaces, root `tsconfig.json` references and the gateway's `tsconfig.app.json` references are updated. The gateway's `package.json` lists the new contract.

**Manual workspace fixes:**
- `npm install` couldn't run offline here. I added the `reviews-contract` and `reviews-service` symlinks under `node_modules/@storefront` by hand.
- I added the matching entries to `package-lock.json` by hand. Run `npm install` once with network access to confirm the lockfile is consistent.

I also added the new projects, the reviews routes and the serve commands to `README.md`.
