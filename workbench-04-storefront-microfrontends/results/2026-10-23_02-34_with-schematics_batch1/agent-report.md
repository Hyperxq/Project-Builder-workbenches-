I added the `reviews` feature as a full-stack slice. `npm run lint`, `npm run typecheck` and `npm run test` all pass from the repo root, and `nx sync` reports everything up to date. I didn't commit, and I didn't start the services or load the microfrontend in a browser.

I created the skeleton with `builder execute default:feature --name=reviews` and then wrote the domain code. It took the next free ports: 3104 for the microfrontend and 4104 for the service.

- **Contract:** `packages/reviews-contract` holds the types (`Review`, `ProductReviews`, `AddReviewBody`), the `list` and `add` message patterns, the service token and the default port.
- **Service:** `apps/reviews-service` keeps reviews in memory by product id. It lists them newest first with the average rating rounded to one decimal. Adding a review needs a non-empty `author` and `comment` and an integer `rating` from 1 to 5. Anything else throws `RpcException` with status 400.
- **Gateway:** `GET /api/reviews/:productId` and `POST /api/reviews/:productId` forward to the service. Listing never answers 404, because an unknown product just has no reviews.
- **Microfrontend:** `apps/reviews` has a product-id field, the average rating and review list, and an add-review form. It uses components from `@storefront/ui` and is already registered in the shell.
- **Tests:** a service handler spec, a gateway controller spec, and a microfrontend spec with the client mocked.
- **README:** I added the layout rows, the two `nx serve` commands, and a convention line for the reviews routes.
