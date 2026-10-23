The `reviews` feature is in as a full-stack slice. `npm run lint`, `npm run typecheck` and `npm run test` all pass from the repo root, and `npx nx sync:check` reports the workspace up to date. Nothing is committed. I haven't started the stack or loaded the microfrontend in a browser, so only the automated checks have exercised it.

I used the `builder execute default:feature --name=reviews` schematic for the skeleton, then ran `npm install` and wrote the domain on top of it.

- **Ports:** the microfrontend is on 3104 and the service on TCP 4104.
- **Contract (`@storefront/reviews-contract`):**
  - It defines `Review`, `ProductReviews`, the payload types, the `list` and `add` patterns, the service token and the default port.
  - `ProductReviews` holds the reviews newest first plus `averageRating`, rounded to one decimal, or 0 when there are none.
- **Service:**
  - Reviews are kept in memory by product id.
  - `add` rejects a missing product id, a blank author, a rating that isn't an integer from 1 to 5, and a blank comment, each with `RpcException` 400.
  - `list` rejects only a missing product id with 400. A product with no reviews returns an empty list.
- **Gateway:**
  - `GET /api/reviews/:productId` lists a product's reviews with its average rating.
  - `POST /api/reviews/:productId` adds a review.
  - Both forward to the service, and the gateway's `RpcErrorFilter` turns a 400 from the service into an HTTP 400.
- **Microfrontend:**
  - The shopper types a product id and sees the reviews (author, rating, comment, date) and the average rating, plus a form to add a review that reloads the list afterwards.
  - It uses `@storefront/ui` components and shows the gateway's error message when a request fails.
- **Tests:** service handler tests, gateway route tests with the client mocked, and microfrontend tests with the client mocked.
- **README:** I added the reviews rows to the layout table, the reviews routes to the conventions, and the `nx serve` rows to the commands table.
