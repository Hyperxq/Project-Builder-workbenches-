The `wishlist` feature is in place as a full-stack slice. `npm run lint`, `npm run typecheck` and `npm run test` all pass from the repository root, and `npx nx sync:check` reports project references up to date. Nothing is committed.

**How I built it:** I generated the skeleton with `builder execute default:feature --name=wishlist`, then ran `npm install`. It created the three projects and the empty gateway controller on port 3104 (microfrontend) and 4104 (service). It also registered the feature in the shell, the gateway module, the root workspaces and the TypeScript references. The generated config files are identical to the cart's. Everything else I wrote by hand:

- **Contract** (`packages/wishlist-contract`): the `Wishlist` and `WishlistItem` types (product id, name, unit price in cents, date added), the request payloads, and three message patterns: get, add item and remove item.
- **Microservice**: wishlists are held in memory, keyed by wishlist id.
  - An unknown id returns an empty wishlist.
  - Adding a product that's already there keeps the one item unchanged, including its original date added.
  - Removing an item that isn't there replies `null`.
  - Bad input (missing id or name, or a price that isn't a whole number of cents ≥ 0) is rejected with `RpcException({ statusCode: 400, message })`.
- **Gateway routes**:
  - `GET /api/wishlist/:wishlistId`
  - `POST /api/wishlist/:wishlistId/items`
  - `DELETE /api/wishlist/:wishlistId/items/:productId`, which answers 404 when the item isn't in the wishlist, like the cart.
  - Only the three item fields are taken from the request body.
- **Microfrontend**: it creates the wishlist id and keeps it in `localStorage` under `storefront.wishlistId`. It lists each item's name, product id, price and date added, with a Remove button per item, plus loading, empty and error states. It uses the components from `@storefront/ui`.
- **Tests**:
  - Service: 10 tests covering the handlers, the duplicate rule, validation and the message patterns.
  - Gateway: forwarding, the 404, and a service 400 becoming an HTTP 400 through `RpcErrorFilter`.
  - Microfrontend: 6 rendering and interaction tests with the client mocked.
- **README**: new rows in the Layout and Commands tables, and a conventions bullet for the wishlist routes.

**Decisions for you:**
- **Add-item form:** the brief asks for adding an item but doesn't say how, and adding from the catalog is out of scope. So I added a small form (product id, name, unit price in dollars, sent as cents) so a shopper can add an item from the wishlist microfrontend. If you'd rather it only list and remove items, the form is one block in `App.tsx` and its two tests can go with it.
- **Re-adding a product:** this keeps the original name, price and date added; it doesn't refresh the name or price with the new values. That's the simplest reading of "keeps one item", but say if you want it to update them instead.

`wishlist-service:lint` shows one warning about an unused `eslint-disable` in `jest.config.cts`. The file is an exact copy of the cart service's, and the reference services have the same warning, so I left it.
