Add the `wishlist` feature to this storefront as a full-stack slice. Read `README.md` first and follow its conventions; the `catalog`, `cart` and `orders` features are the reference for every part.

The feature lets a shopper keep a wishlist: see its items (product id, name, unit price, date added), add an item and remove an item. Adding a product that is already in the wishlist keeps one item. Wishlists are held in memory by the service, keyed by a wishlist id the microfrontend creates and keeps in the browser; there is no database. An item carries the product id, name and unit price sent by the client. Adding to the wishlist from the catalog microfrontend is out of scope.

The slice has these parts:

1. A provider microfrontend named `wishlist`, registered in the shell and rendered by it. It uses the components and theme from `@storefront/ui`.
2. A NestJS microservice for the wishlist as its own application. The gateway talks to it through the NestJS microservices TCP transport; the microservice exposes no HTTP API of its own.
3. The gateway HTTP routes the microfrontend calls (get a wishlist, add an item, remove an item), which forward to the microservice. Invalid input answers 400.
4. One typed contract shared by the microfrontend, the gateway and the microservice, following the contract library convention.
5. Tests on both sides: the microservice's handlers, the gateway routes, and the microfrontend's rendering of the wishlist with the client mocked.

Done means `npm run lint`, `npm run typecheck` and `npm run test` all pass from the repository root. Do not commit.
