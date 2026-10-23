Add the `cart` feature to this storefront as a full-stack slice. Read `README.md` first and follow its conventions; the `catalog` feature is the reference for every part.

The feature lets a shopper manage a cart: see its lines (product name, unit price, quantity, line total) and the cart total, add a product, change a line's quantity, and remove a line. Carts are held in memory by the service, keyed by a cart id the microfrontend creates and keeps in the browser; there is no database. A line carries the product id, name and unit price sent by the client when the product is added. Adding to the cart from the catalog microfrontend is out of scope.

The slice has these parts:

1. A provider microfrontend named `cart`, created with the Nx React provider generator as the README describes, registered in the shell and rendered by it. It uses the components and theme from `@storefront/ui`.
2. A NestJS microservice for the cart, created with `@nx/nest` as its own application. The gateway talks to it through the NestJS microservices TCP transport; the microservice exposes no HTTP API of its own.
3. The gateway HTTP routes the microfrontend calls (get a cart, add a line, change a line's quantity, remove a line), which forward to the microservice.
4. One typed contract shared by the microfrontend, the gateway and the microservice, following the contract library convention.
5. Tests on both sides: the microservice's handlers, the gateway routes, and the microfrontend's rendering of the cart with the client mocked.

Follow the conventions the README sets for names, ports and contract libraries, and write any new convention you introduce into the README.

Done means `npm run lint`, `npm run typecheck` and `npm run test` all pass from the repository root. Do not commit.
