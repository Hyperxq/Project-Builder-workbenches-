I've added the `reviews` feature as a full slice. `npm run lint`, `npm run typecheck` and `npm run test` all pass from the repository root, and `npx nx sync:check` reports the workspace is up to date. Nothing is committed.

**Behaviour**
- **Routes:** `GET /api/reviews/:productId` and `POST /api/reviews/:productId` (body: author, rating, comment).
- **Response:** both return the product's reviews, newest first, with an average rating. The average is rounded to one decimal and is `null` when there are no reviews.
- **Unknown products:** a product with no reviews gets an empty list, not a 404, as with an empty cart.
- **Validation:** the service rejects bad input with a 400. The rules are:
  - the author name is required, up to 80 characters;
  - the rating must be a whole number from 1 to 5;
  - the comment is required, up to 2,000 characters.

  Spaces around the author, comment and product id are trimmed. The length limits are my own choice; the task didn't set any.
- **Microfrontend:** on port 3104 and registered in the shell. The shopper types a product id and sees the average and the reviews (author, rating, comment, date), with a form underneath to add one. If the gateway rejects a review, its error message is shown above the form.
- **Service:** runs on TCP port 4104 and keeps reviews in memory, keyed by product id.

**Tests**
- **Service (8 tests):** listing, adding, newest-first order, averages, separate products, trimming, each validation rule, and the shape of the 400 error.
- **Gateway:** what the routes forward to the service, plus real HTTP requests against a test server with the service mocked. Those check the 200 and 201 responses and that a rejected review comes back as a 400.
- **Microfrontend (5 tests):** with the client mocked, it renders the reviews and average, the empty state, a loading error, adding a review, and a rejected review.

I also built the gateway and service, ran them, and called the routes with `curl`. Reviews were saved and the average updated, and bad input got a 400 with the service's message.

**Generator clean-up and changes outside the feature**
- **Contract:** I removed `"type": "module"` and the `.js` import and set `nx.name`.
- **Service:**
  - Deleted the `-e2e` project and its workspace entry, `tsconfig.json` reference and `nx.json` exclusion.
  - Removed the `axios` dependency.
  - Copied the Jest and tsconfig files from `catalog-service`.
- **Microfrontend:** the generator set port 3101 again; I changed it to 3104 and copied the config files from `catalog`.
- **`.vscode/launch.json`:** the service generator added a debug entry. I kept it but changed it to the project name that actually exists (`reviews-service`).
- **README:** added the new projects, the routes and their rules, and the serve commands.

**Two things that might look like problems**
- **`nx sync:check` output:** before syncing, it also listed the web apps as missing from the root `tsconfig.json`. That's how Nx reports it, not a real gap: `nx sync` doesn't add those apps, and the only file it changed was the gateway's reference to the new contract.
- **Lint warning:** there is one warning about an unused `eslint-disable` in `reviews-service/jest.config.cts`. `catalog-service` and `orders-service` get the same warning, so I left the file matching theirs.
