Add the `promotions` feature to this storefront as a full-stack slice. Read `README.md` first and follow its conventions; the `catalog`, `cart` and `orders` features are the reference for every part.

The feature lets a shopper see the active promotions and check a promo code: list the promotions (code, description, percentage off) and validate a code against an amount, answering the discount and the amount after it. Unknown codes answer 404. Promotions are seed data held in memory by the service; there is no database. Applying a code to the cart is out of scope.

The slice has these parts:

1. A provider microfrontend named `promotions`, registered in the shell and rendered by it. It uses the components and theme from `@storefront/ui`.
2. A NestJS microservice for promotions as its own application. The gateway talks to it through the NestJS microservices TCP transport; the microservice exposes no HTTP API of its own.
3. The gateway HTTP routes the microfrontend calls (list promotions, validate a code against an amount), which forward to the microservice. Invalid input answers 400.
4. One typed contract shared by the microfrontend, the gateway and the microservice, following the contract library convention.
5. Tests on both sides: the microservice's handlers, the gateway routes, and the microfrontend's rendering of the promotions with the client mocked.

Done means `npm run lint`, `npm run typecheck` and `npm run test` all pass from the repository root. Do not commit.
