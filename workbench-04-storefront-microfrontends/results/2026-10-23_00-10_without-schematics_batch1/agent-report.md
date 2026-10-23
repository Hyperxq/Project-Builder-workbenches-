The `reviews` slice is in. `npm run lint`, `npm run typecheck` and `npm run test` all pass from the root, and `npx nx sync:check` is clean. Nothing is committed.

I haven't run the services or the shell, so the TCP and federation wiring is only covered by the tests.

- **Contract:** `packages/reviews-contract` holds the `Review`, `ProductReviews`, `AddReviewBody` and payload types, `REVIEWS_PATTERNS`, the `REVIEWS_SERVICE` token and the default port 4104. It follows the orders contract layout.
- **Service:** `apps/reviews-service` is a TCP microservice on port 4104 (`REVIEWS_SERVICE_PORT` overrides it), with no HTTP API. The reviews are kept in memory by product id. A list returns the reviews newest first, the average rating rounded to one decimal (`null` when there are none) and the review count. A blank author or comment, or a rating that isn't an integer from 1 to 5, is rejected with a 400 `RpcException`.
- **Gateway:** `GET /api/reviews/:productId` and `POST /api/reviews/:productId` forward to the service through a new `ClientsModule` entry. An unknown product lists as empty rather than answering 404.
- **Microfrontend:** `apps/reviews` runs on port 3104 and is registered in the shell's `mf.ts` and rendered in `App.tsx`. The shopper types a product id, sees the average rating and the reviews, and can add a review. The client shows the gateway's error message on a 400.
- **Tests:** the service handlers, the gateway routes, and the microfrontend rendering with the client mocked.

I also added the new service to the root workspaces and `tsconfig.json` references, and added rows for the new projects and gateway routes to the README.

`npm install --offline` failed because a package wasn't in the cache. I created the two `node_modules/@storefront` symlinks by hand and ran `npm install --package-lock-only` to update `package-lock.json`.
