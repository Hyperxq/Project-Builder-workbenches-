I've added the wishlist feature as a full slice, following the catalog, cart and orders pattern. `npm run lint`, `npm run typecheck` and `npm run test` all pass from the root, and `npx nx sync:check` reports nothing stale. Nothing is committed.

**What was added**
- **Contract** (`packages/wishlist-contract`): the wishlist and item types, request payloads, message patterns, service token and default TCP port 4104. An item has product id, name, unit price in cents, and the date added, which the service sets.
- **Microservice** (`apps/wishlist-service`): a TCP-only NestJS app that keeps wishlists in memory, keyed by wishlist id.
  - Adding a product that is already in the wishlist keeps the one existing item unchanged, including its original date added.
  - Items are listed in the order they were added.
  - Bad input (missing wishlist id, empty product id or name, a price that isn't a whole number of cents ≥ 0) is rejected with `RpcException({ statusCode: 400, message })`.
- **Gateway routes**, with the service address read from `WISHLIST_SERVICE_HOST` / `WISHLIST_SERVICE_PORT`:
  - `GET /api/wishlist/:wishlistId`: an unknown id returns an empty wishlist, never a 404.
  - `POST /api/wishlist/:wishlistId/items`
  - `DELETE /api/wishlist/:wishlistId/items/:productId`: answers 404 if the item isn't there.
- **Microfrontend** (`apps/wishlist`, port 3104, registered in the shell and rendered there): keeps the wishlist id in `localStorage` and lists each item's name, product id, price and date added, with a Remove button. It is built from `@storefront/ui` components and the shared theme.
- **README**: new rows in the layout table, a section on the wishlist routes, and the serve commands.

**Tests**
- **Service:** 10 tests of the handlers.
- **Gateway:** unit tests plus HTTP tests that start the app on a real port and check the 200, 201, 400 and 404 statuses. Supertest isn't installed, so they use Node's built-in `fetch`.
- **Microfrontend:** 7 tests with the client mocked.

I also ran the built service and gateway together and sent requests through TCP: get, add, re-add (still one item), bad price and empty body (both 400), and remove (404 for a missing item, 200 otherwise) all behaved as expected.

**Decisions for you**
- **The add form.** Since adding from the catalog was out of scope, the only way for a shopper to add an item is a small form in the wishlist itself (product id, name, price in dollars). Typing a product id by hand is awkward; once the catalog can add items, you may want to remove the form.
- **Re-adding a product** keeps the original item as it was. If you'd rather it pick up the newly sent name and price, that's a one-line change in the service.

**Other changes and cleanup**
- **Generator cleanup:** the service generator added an `-e2e` project, `axios`, a jest exclude in `nx.json`, an edit to the tracked `.vscode/launch.json`, and a root tsconfig reference to the e2e project. I reverted all of these as the README says.
- **Contract settings:** the library generator set `"type": "module"`, used `.js` imports and left out `nx.name`. I changed these to match the other contract libraries.
- **Lint warning:** lint passes with one warning per service about an unused `/* eslint-disable */`. It comes from the `jest.config.cts` copied from `catalog-service`, and the three existing services show the same warning, so I left it as is.
