The `wishlist` slice is in. `npm run lint`, `npm run typecheck` and `npm run test` all pass from the root, and `npx nx sync:check` reports the workspace up to date. I didn't commit.

I copied the config files from the `cart` slice, set the ports and workspace entries, and wrote the feature code. I didn't run the generators or serve anything, so the shell hasn't loaded the microfrontend and the gateway hasn't talked to the service over TCP.

- **Contract** (`packages/wishlist-contract`): `Wishlist`, `WishlistItem` (product id, name, unit price in cents, `addedAt` as an ISO timestamp), the request payloads, `WISHLIST_PATTERNS`, the `WISHLIST_SERVICE` token and `WISHLIST_SERVICE_DEFAULT_PORT` (4104).
- **Service** (`apps/wishlist-service`): TCP only, with wishlists kept in a map keyed by wishlist id.
  - Adding a product that's already there keeps the one item and its original `addedAt`.
  - Missing or non-string `productId`/`name`, or a `unitPrice` that isn't a non-negative integer, is rejected with an `RpcException` carrying `statusCode: 400`.
  - Removing an absent item replies `null`.
- **Gateway**: `GET /api/wishlist/:id`, `POST /api/wishlist/:id/items` and `DELETE /api/wishlist/:id/items/:productId`. A missing request body reaches the service and comes back as 400. Removing an absent item answers 404, and getting an unknown id returns an empty wishlist.
- **Microfrontend** (`apps/wishlist`, port 3104): lists name, price and date added, with a Remove button, using `@storefront/ui`. The wishlist id is a UUID kept in `localStorage`. It is registered in the shell's `PROVIDERS` in `mf.ts` and rendered in `App.tsx`.
- **Tests**:
  - Service: 9 controller tests.
  - Gateway: 5 route tests.
  - Microfrontend: 4 rendering tests with the client mocked.

I also updated the README layout table, the commands table and the gateway route conventions. Prettier realigned the README tables, so that diff is larger than the rows I added.

`npm install --offline` failed because the registry isn't reachable. So I hand-edited `package-lock.json` for the new workspace and added the two `node_modules/@storefront` symlinks myself. Run a normal `npm install` when you can, to confirm the lockfile matches what npm would write.
