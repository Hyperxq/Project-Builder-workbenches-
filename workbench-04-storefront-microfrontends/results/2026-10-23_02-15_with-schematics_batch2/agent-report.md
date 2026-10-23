The `wishlist` feature is in as a full-stack slice. `npm run lint`, `npm run typecheck` and `npm run test` all pass from the repo root, and `nx sync` reported nothing stale. I haven't run the shell, gateway, service and microfrontend together, so the HTTP routes and the UI are only covered by the unit tests. Nothing is committed.

I generated the skeleton with `builder execute default:feature --name=wishlist`, then `npm install`, then wrote the domain code.

- **Ports:** the microfrontend is on 3104 and the service on TCP 4104.
- **Contract (`@storefront/wishlist-contract`):**
  - Types: `Wishlist` and `WishlistItem` (product id, name, unit price in cents, ISO `addedAt`).
  - Message patterns: `wishlist.get`, `wishlist.addItem` and `wishlist.removeItem`.
  - Also holds the payload and body types, the `WISHLIST_SERVICE` token and the default port.
- **Service (`wishlist-service`):**
  - Wishlists are held in memory, keyed by wishlist id.
  - Adding a product that is already there keeps one item.
  - Bad input (empty ids or name, a negative or non-integer price) is rejected with `RpcException` 400.
  - Removing an item that isn't there replies `null`.
- **Gateway routes:**
  - `GET /api/wishlist/:wishlistId` never returns 404; an unknown id is an empty wishlist.
  - `POST /api/wishlist/:wishlistId/items` adds an item.
  - `DELETE /api/wishlist/:wishlistId/items/:productId` returns 404 when the item isn't in the wishlist.
- **Microfrontend:** it lists items with name, price and date added, shows empty, loading and error states, and has a Remove button. It builds its UI from `@storefront/ui` and keeps the wishlist id in `localStorage`. The client also has an `addItem` function, but the UI doesn't call it, since adding from the catalog is out of scope.
- **Tests:** service handler tests, gateway controller tests with the client mocked, and microfrontend rendering tests with `./client` mocked.
- **README:** I added the project and contract rows, a wishlist routes convention bullet, and the `nx serve` command rows.

I ran Prettier over the wishlist files and the gateway source, so the formatting follows the repo's.
