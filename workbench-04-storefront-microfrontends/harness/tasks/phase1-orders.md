Add the `orders` feature to this storefront as a full-stack slice. Read `README.md` first and follow its conventions; the `catalog` and `cart` features are the reference for every part.

The feature lets a shopper place an order and see their orders: place an order from a list of lines (product id, name, unit price, quantity), list their orders (id, date, status, total) and see one order's detail with its lines. A new order has the status `placed`. Orders are held in memory by the service, keyed by a customer id the microfrontend creates and keeps in the browser; there is no database. Placing an order from the cart microfrontend, payment and status changes are out of scope.

The slice has these parts:

1. A provider microfrontend named `orders`, created with the Nx React provider generator as the README describes, registered in the shell and rendered by it. It uses the components and theme from `@storefront/ui`.
2. A NestJS microservice for orders, created with `@nx/nest` as its own application. The gateway talks to it through the NestJS microservices TCP transport; the microservice exposes no HTTP API of its own.
3. The gateway HTTP routes the microfrontend calls (place an order, list a customer's orders, get one order), which forward to the microservice.
4. One typed contract shared by the microfrontend, the gateway and the microservice, following the contract library convention.
5. Tests on both sides: the microservice's handlers, the gateway routes, and the microfrontend's rendering of the order list with the client mocked.

Follow the conventions the README sets for names, ports and contract libraries, and write any new convention you introduce into the README.

Done means `npm run lint`, `npm run typecheck` and `npm run test` all pass from the repository root. Do not commit.
