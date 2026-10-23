The `reviews` feature is in place as a full-stack slice. `npm run lint`, `npm run typecheck` and `npm run test` all pass from the repo root, and `nx sync:check` reports no stale references. I didn't start the services or load the microfrontend in the shell, so nothing was run end to end. Nothing is committed.

I scaffolded it with `builder execute default:feature --name=reviews` and then `npm install`, instead of the Nx generators. The schematic wired in the shell registration, gateway module, workspaces, project references and README. The ports are 3104 for the microfrontend and 4104 for the service.

- **Contract:** `@storefront/reviews-contract` defines `Review`, `ProductReviews`, the add-review body and payloads, and two message patterns (`reviews.list`, `reviews.add`).
- **Service:** `apps/reviews-service` keeps reviews in memory by product id, newest first. The average rating is rounded to one decimal and is 0 when there are no reviews.
- **Validation:** a missing product id, author or comment, or a rating that isn't an integer from 1 to 5, is rejected with `RpcException({ statusCode: 400, message })`.
- **Gateway:** `GET /api/reviews/:productId` and `POST /api/reviews/:productId`, both forwarding to the service. Invalid input comes back as 400 through the existing `RpcErrorFilter`. Listing an unknown product returns an empty list rather than 404.
- **Microfrontend:** `apps/reviews` has a product-id field, the average rating, the review list (author, rating, date, comment) and a "Write a review" form, built from `@storefront/ui`. It reloads the list after a review is added.
- **Tests:**
  - Service handlers: average, per-product isolation and the 400 cases.
  - Gateway routes: forwarding and error propagation.
  - Microfrontend: rendering, empty state, error and submit, with the client mocked.

I ran Prettier over the generated and new files, which also reformatted the schematic's edit to `apps/gateway/src/app/app.module.ts`.
