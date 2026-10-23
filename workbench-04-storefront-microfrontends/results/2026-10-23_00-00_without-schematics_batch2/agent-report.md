The `wishlist` slice is in place, and `npm run lint`, `npm run typecheck` and `npm run test` all pass from the repo root. I didn't start the services or load the shell in a browser, so the TCP link, the HTTP routes and the federation load are only covered by the tests, not run end to end. Nothing is committed.

I built it by copying the `orders` slice and rewriting the domain files, rather than running the Nx generators.

- **Contract (`packages/wishlist-contract`):** `Wishlist` and `WishlistItem` types, the request payloads and the `WISHLIST_PATTERNS` message patterns. It also holds the `WISHLIST_SERVICE` token and the default port 4104.
- **Service (`apps/wishlist-service`):**
  - It is a TCP microservice with no HTTP API. It keeps wishlists in memory, keyed by wishlist id.
  - Adding a product that is already in the wishlist keeps one item.
  - Bad input is rejected with `RpcException({ statusCode: 400, message })`.
  - Removing an item that isn't in the wishlist replies `null`.
- **Gateway:** three routes forward to the service.
  - `GET /api/wishlist/:wishlistId` never 404s; an unknown id is an empty wishlist.
  - `POST /api/wishlist/:wishlistId/items` adds an item.
  - `DELETE /api/wishlist/:wishlistId/items/:productId` answers 404 when the item isn't there.
  - Invalid input answers 400 through the existing `RpcErrorFilter`.
- **Microfrontend (`apps/wishlist`):**
  - It serves on port 3104.
  - It lists name, unit price and date added, with a Remove button per item, using `@storefront/ui`.
  - The wishlist id is a UUID kept in `localStorage`.
  - `client.ts` also exports `addWishlistItem`, but nothing in the UI calls it.
- **Shell:** the provider is registered in `mf.ts` and rendered in a `ProviderBoundary` in `App.tsx`.
- **Workspace wiring:** root `package.json` workspaces, root `tsconfig.json` references, the gateway's `package.json` and project references, and `README.md`. The README has the layout rows, a wishlist convention line and the serve commands.
- **Tests:** the service handlers, the gateway controller, and the microfrontend rendering with the client mocked.

`npx nx sync` reports everything up to date.
