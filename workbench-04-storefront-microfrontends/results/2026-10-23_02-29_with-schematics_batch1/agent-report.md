The `reviews` feature is in place as a full-stack slice. `npm run lint`, `npm run typecheck` and `npm run test` all pass from the repo root, and `nx sync` reports the project references are up to date. I didn't commit, and I haven't run the services or the microfrontend together.

I created the skeleton with the `default:feature` schematic and then ran `npm install`. It put the microfrontend on port 3104 and the service on TCP port 4104.

- **Contract** (`packages/reviews-contract`): `Review`, `ProductReviews` (average rating, count, reviews), the add and list payloads, the message patterns, the service token and the default port.
- **Service** (`apps/reviews-service`): reviews are held in memory by product id and listed newest first.
  - **Average rating:** it is rounded to one decimal, and is 0 for a product with no reviews.
  - **Validation:** adding a review needs a product id, an author, an integer rating from 1 to 5 and a comment. Anything else is rejected with `RpcException({ statusCode: 400, ... })`.
- **Gateway** (`apps/gateway`): `GET /api/reviews/:productId` and `POST /api/reviews/:productId` forward to the service. Listing an unknown product returns an empty result rather than a 404.
- **Microfrontend** (`apps/reviews`): you type a product id, then see the average rating and the reviews (author, stars, date, comment). Once a product is loaded, a form lets you add a review, and the list reloads afterwards. It is registered in the shell by the schematic and uses `@storefront/ui` components.
- **Tests:** service handlers, including the 400 cases. Gateway routes with the client mocked. Microfrontend rendering with `./client` mocked: reviews and average, empty state, load error, and submitting a review.
- **README:** I added the table rows, a reviews convention and the `nx serve` commands.
