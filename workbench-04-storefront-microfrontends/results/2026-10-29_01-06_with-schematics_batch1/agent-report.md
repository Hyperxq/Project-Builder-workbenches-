I've added the `reviews` feature as a full-stack slice. `npm run lint`, `npm run typecheck` and `npm run test` all pass from the repository root, and `npx nx sync:check` reports the project references are up to date. Nothing is committed.

**Skeleton.** I generated it with `builder execute default:feature --name=reviews`, checked its changes against the `orders` feature, then ran `npm install`. It wired the feature into the shell (provider on port 3104, in `PROVIDERS` and in a `ProviderBoundary`), the gateway module (a TCP client on port 4104, reading `REVIEWS_SERVICE_HOST`/`PORT`), the root workspaces and the project references.

**What I wrote:**
- **Contract** (`packages/reviews-contract`): types only. `Review` has author, rating, comment and date; `ProductReviews` has the list (newest first), `count` and `averageRating`, which is `null` when a product has no reviews. It also defines the request types, the 1 and 5 rating limits, and the two message patterns (`reviews.list`, `reviews.add`).
- **Microservice** (`apps/reviews-service`): keeps reviews in memory, keyed by product id. Bad input is rejected with `RpcException({ statusCode: 400, message })`:
  - an empty product id;
  - an author that is empty after trimming or over 80 characters;
  - a comment that is empty after trimming or over 2,000 characters;
  - a rating that is not a whole number from 1 to 5.

  The 80 and 2,000 limits are my choice; the brief didn't set any.
- **Gateway** (`apps/gateway/src/app/reviews.controller.ts`):
  - `GET /api/reviews/:productId` returns the reviews and average. It never answers 404: an unknown product just has no reviews.
  - `POST /api/reviews/:productId` adds a review. It forwards only the three review fields, with the product id taken from the URL.
- **Microfrontend** (`apps/reviews`): the shopper types a product id and sees the average (one decimal, with stars), the review count and each review. Below that is a form to add a review; after posting, the list reloads. Errors from the service, such as a 400 reason, are shown to the shopper. It uses `@storefront/ui` components and the theme.
- **Tests:**
  - Service: 8 tests covering adding, ordering, the average, the empty-product case, products kept separate, every validation rule and the message patterns.
  - Gateway: 6 tests. Three check what is forwarded to the service. Three run real HTTP requests through the gateway's error filter, including one confirming that a rejected review comes back as **HTTP 400**.
  - Microfrontend: 6 tests with the client mocked, covering the list with author, rating, comment and date; the average; the empty state; a load error; adding a review; and showing a rejection reason.
- **README:** the table rows, a conventions paragraph on the reviews routes and validation, and the `serve` commands.

Lint reports one warning, an unused `eslint-disable` line in `reviews-service/jest.config.cts`. That file is copied from the other services, which all have the same warning. The "Internal server error" text in the test output is logged by the existing `rpc-error.filter.spec.ts`.
