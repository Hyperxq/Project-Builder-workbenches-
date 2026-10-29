The `reviews` feature is in place as a full-stack slice, and `npm run lint`, `npm run typecheck` and `npm run test` all pass from the root. `nx sync:check` reports no stale project references. Nothing is committed.

I created the skeleton with `builder execute default:feature --name=reviews` and then ran `npm install`. It wired the slice into the shell, the gateway, the workspaces and the project references, on ports **3104** (microfrontend) and **4104** (service). I then wrote the domain code:

- **Contract** (`@storefront/reviews-contract`): the review and product-reviews types, the request bodies, the 1–5 rating limits, and the two message patterns (list and add). It holds only types and constants.
- **Service** (`reviews-service`, TCP only): keeps reviews in memory by product id. Listing returns them newest first, with the average rounded to one decimal. A product with no reviews gets an empty list and a `null` average, not a 404. Bad input is rejected with `RpcException({ statusCode: 400, message })`:
  - blank product id
  - rating that isn't a whole number from 1 to 5
  - empty name (max 80 characters) or empty comment (max 2000)
- **Gateway**: `GET /api/reviews/:productId` and `POST /api/reviews/:productId`. The POST answers 201 with the new review. It passes on only the name, rating and comment from the body, so a client can't supply its own id or product id.
- **Microfrontend** (`reviews`): built from `@storefront/ui` components. The shopper types a product id and sees the average, the count, and each review's name, stars, comment and date. A form adds a review and then reloads the list. Errors from the service, such as a 400 reason, are shown to the shopper. `@storefront/ui` has no textarea, so the comment field is a plain `<textarea>` styled to match `Input`.
- **Tests**:
  - Service (9): handlers, sorting, average, separate products, every validation case, the 400 error shape, message patterns.
  - Gateway (6): forwarding, plus real HTTP requests showing 200, 201, and a service 400 coming back as HTTP 400.
  - Microfrontend (7): rendering with the client mocked, empty and error states, adding a review, a rejected review, a missing rating.
- **README**: rows in the layout table, a conventions bullet for the reviews routes, and `serve` commands for both projects.

I also ran the built service and gateway together and called the real routes. Listing, adding two reviews (average 4.5), and the 400s for a bad rating and an empty body all behaved as described. I stopped both servers afterwards.

There's no check against the catalog, so reviews can be added for any product id, including ones that don't exist. Checking would need the reviews service to call `catalog-service`, which I left out to keep the slice self-contained.
