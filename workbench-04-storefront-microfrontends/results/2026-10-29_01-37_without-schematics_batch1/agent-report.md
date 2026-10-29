The `reviews` feature is in place as a full slice. `npm run lint`, `npm run typecheck` and `npm run test` all pass from the root, and `nx sync:check` reports nothing stale. Nothing is committed.

I also built the service and gateway, ran them, and called the routes with curl. A product with no reviews returns an empty list with a `null` average. A valid review answers 201, and the average updated to 4.5 after a 5 and a 4. Bad input answers 400 with the service's reason, for example `rating must be an integer from 1 to 5`.

**What was added**
- **Contract** (`packages/reviews-contract`): the `Review` and `ProductReviews` types, the request payloads, the rating limits (1 to 5), the message patterns, the service token and the default port 4104.
- **Microservice** (`apps/reviews-service`): a TCP-only NestJS service on 4104 (`REVIEWS_SERVICE_PORT` overrides it) that keeps reviews in memory by product id. Listing shows newest first, and the average is rounded to one decimal, or `null` when there are no reviews. It requires a product id, an author name (up to 80 characters), a comment (up to 2000) and a whole-number rating from 1 to 5. Anything else is rejected as a 400.
- **Gateway**: two routes, `GET /api/reviews/:productId` and `POST /api/reviews/:productId`. The POST forwards only the review fields from the body, so a client can't set its own id or product id.
- **Microfrontend** (`apps/reviews`, port 3104): the shopper types a product id and sees the average, the review count and each review (author, stars, comment, date), plus a form to write a review. When the gateway rejects a review, the form shows the reason. It's registered in the shell's `mf.ts` and rendered in `App.tsx`.
- **README**: new layout rows, a note on how the reviews routes behave, and the serve commands.

**Tests**
- **Service** (8 tests): adding and listing, newest-first order, average rounding, products kept separate, the error format the gateway relies on, rejection of invalid input, and the message patterns.
- **Gateway** (6 tests): forwarding to the service, plus real HTTP requests through `RpcErrorFilter` that check a rejected review comes back as an actual 400. They use Node's built-in `fetch` because `supertest` isn't installed.
- **Microfrontend** (7 tests, client mocked): showing reviews, the empty state, load errors, adding a review, the missing-rating check and showing a rejection reason.

**Choices you may want to revisit**
- Adding a review returns the product's full updated review list rather than just the new review, so the page refreshes the list and the average from one call.
- The service doesn't check the product id against the catalog: any id can be reviewed.
- I cleaned up after the generators as the README says: removed the e2e project, the `axios` dependency and the `nx.json` exclusion. I also reverted the debug entry the service generator added to `.vscode/launch.json`, because orders didn't keep one either.
