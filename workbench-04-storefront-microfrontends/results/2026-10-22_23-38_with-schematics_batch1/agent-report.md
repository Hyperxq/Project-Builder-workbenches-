I added the `reviews` feature as a full-stack slice. `npm run lint`, `npm run typecheck` and `npm run test` all pass from the repository root, and `nx sync:check` reports everything up to date. I didn't commit, and I haven't served the apps, so the microfrontend hasn't been run against the gateway and service in a browser.

I used `builder execute default:feature --name=reviews` to create the skeleton and wire it into the shell, gateway module, workspaces and README. It picked port 3104 for the microfrontend and 4104 for the service. I then ran `npm install` and wrote the domain code:

- **Contract:** `packages/reviews-contract` holds `Review`, `ProductReviews`, the add and list payloads, and the `list` and `add` message patterns.
- **Service:** `apps/reviews-service` keeps reviews in memory by product id and returns them newest first, with the average rating rounded to one decimal and 0 when there are none. It rejects a blank product id, author or comment, and a rating that isn't an integer from 1 to 5. Each rejection is an `RpcException` with status 400.
- **Gateway:** `GET /api/reviews/:productId` lists a product's reviews, and `POST /api/reviews/:productId` adds one. Both forward to the service, so bad input comes back as 400.
- **Microfrontend:** `apps/reviews` has a product id field. Once reviews load, it shows the average rating, the reviews and an add-review form. It is built from the `@storefront/ui` components.
- **Tests:** the service handlers, the gateway routes (with the client mocked), and the microfrontend rendering, add flow and error display (with `./client` mocked).

The README layout table still has no row for the reviews projects, and its commands table has no `serve` lines for them. I didn't check whether the schematic added them, so check that before committing.
