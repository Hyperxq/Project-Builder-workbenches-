Add the `catalog` feature to this storefront as a full-stack slice. Read `README.md` first and follow its conventions.

The feature lets a shopper browse products: a grid of products (name, price, image, short description) and a product detail view. Products are seed data held in memory by the service; there is no database.

The slice has these parts:

1. A provider microfrontend named `catalog`, created with the Nx React provider generator as the README describes, registered in the shell and rendered by it. It uses the components and theme from `@storefront/ui`.
2. A NestJS microservice for the catalog, created with `@nx/nest` as its own application. The gateway talks to it through the NestJS microservices TCP transport; the microservice exposes no HTTP API of its own.
3. The gateway HTTP routes the microfrontend calls (list products, get one product by id), which forward to the microservice.
4. One typed contract shared by the microfrontend, the gateway and the microservice (the product type and the message patterns), in a library the module boundary rules allow all three to import. Add tags and boundary rules if the existing ones do not cover it.
5. Tests on both sides: the microservice's handlers, the gateway routes, and the microfrontend's rendering of the list with the client mocked.

Pick the ports following the README and write any new convention you introduce (service names, TCP ports, contract libraries) into the README, because the next features will copy this one.

Done means `npm run lint`, `npm run typecheck` and `npm run test` all pass from the repository root. Do not commit.
