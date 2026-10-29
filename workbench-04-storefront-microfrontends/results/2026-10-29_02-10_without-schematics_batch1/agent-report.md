The `reviews` feature is built as a full-stack slice and nothing is committed. `npm run lint`, `npm run typecheck` and `npm run test` all pass from the root, and `nx sync:check` reports no stale project references. I also started the built reviews service and gateway and called the routes with curl over real TCP. Listing, adding, the average rating and the 400 responses for bad input all behaved as expected.

**What was added**
- **Contract** (`packages/reviews-contract`): the `Review` and `ProductReviews` types, the request payloads, `REVIEWS_PATTERNS`, the `REVIEWS_SERVICE` token, rating limits of 1 to 5, and the default port 4104.
- **Microservice** (`apps/reviews-service`): TCP only, on port 4104 (`REVIEWS_SERVICE_PORT` overrides it). It keeps reviews in memory by product id and lists them newest first, with the average rating and a count. Bad input (blank product id, author name or comment, or a rating that isn't a whole number from 1 to 5) is rejected with `RpcException({ statusCode: 400, message })`. Rejected reviews are not stored.
- **Gateway**: a TCP client for the service and two routes:
  - `GET /api/reviews/:productId` never returns 404. A product with no reviews comes back with an empty list and a `null` average, like an unknown cart.
  - `POST /api/reviews/:productId` passes on only the author name, rating and comment, so the request body can't override the product id.
- **Microfrontend** (`apps/reviews`, port 3104), registered in the shell's `PROVIDERS` and `App.tsx`. The shopper types a product id and sees each review's author, star rating, comment and date, plus the average. A form built from `@storefront/ui` components adds a review and then reloads the list. When the gateway answers 400, the service's reason (e.g. "rating must be an integer from 1 to 5") is shown to the shopper.
- **Tests**: 9 for the service's handlers, 7 for the gateway and 8 for the microfrontend (client mocked). Three of the gateway tests start a real HTTP server with the actual `RpcErrorFilter`, which checks the 400 status itself, not just that the call is forwarded.

**Generator clean-up done by hand, as the README lists:** I removed the `reviews-service-e2e` project, the `axios` dependency and the `nx.json` jest exclusion. I also dropped `type: module` from the contract, set every `nx.name`, changed the port the generator wrote (3101) to 3104, and copied the config files from `catalog`. I also reverted the generated `.vscode/launch.json` entry, since `orders-service` doesn't have one either.

**Worth knowing:**
- Lint reports one warning, "Unused eslint-disable directive", in `reviews-service/jest.config.cts`. The file is copied from `catalog-service` and every existing service gives the same warning; it doesn't fail lint.
- The textarea for the comment is a plain HTML `<textarea>` styled like the `Input` component, because `@storefront/ui` has no textarea.
- I added the new projects, ports, routes and serve commands to the README tables.
