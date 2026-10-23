The `reviews` feature is in as a full-stack slice. `npm run lint`, `npm run typecheck` and `npm run test` all pass from the repo root, and `npx nx sync:check` reports the workspace up to date. I didn't commit. I haven't started the services or the shell, so none of it has been run end to end.

I used the `default:feature` schematic and ran `npm install` afterwards. It created the three projects and the gateway controller, and wired them into the shell, the gateway module, the workspaces, the project references and the README. Its ports are 3104 for the microfrontend and 4104 for the service.

- **Contract (`@storefront/reviews-contract`):**
  - Types and payloads: `Review`, `ProductReviews`, `AddReviewBody` and the two message payloads.
  - Patterns and defaults: `REVIEWS_PATTERNS` with `list` and `add`, the `REVIEWS_SERVICE` token and the default port.
- **Service (`reviews-service`):**
  - Storage: reviews are kept in memory per product id. Listing is newest first, with the average rating rounded to one decimal, or 0 when there are none.
  - Validation: `add` needs a product id, an author, a comment and an integer rating from 1 to 5. Otherwise it throws `RpcException` with status 400.
- **Gateway:** `GET /api/reviews/:productId` and `POST /api/reviews/:productId` forward to the service.
- **Microfrontend (`reviews`):** you type a product id and see the reviews and average rating. A form below the list adds a review and reloads the list. It uses the components from `@storefront/ui`.
- **Tests:**
  - The service spec covers the handlers: empty list, add, ordering and average, and the 400 cases.
  - The gateway spec covers forwarding and error propagation.
  - The microfrontend spec mocks the client and covers rendering, the empty state, the error state and submitting a review.

One thing to know: the gateway tests call the controller directly, so the 400 response itself (`RpcErrorFilter` turning the service error into HTTP) isn't tested. The gateway test only checks that the controller passes the service's rejection through.
