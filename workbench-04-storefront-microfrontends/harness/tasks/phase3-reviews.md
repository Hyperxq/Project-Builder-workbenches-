Add the `reviews` feature to this storefront as a full-stack slice. Read `README.md` first and follow its conventions; the `catalog`, `cart` and `orders` features are the reference for every part.

The feature lets a shopper read and write product reviews: list the reviews of a product (author name, rating from 1 to 5, comment, date) with the product's average rating, and add a review to a product. Reviews are held in memory by the service, keyed by product id; there is no database. The product id is typed by the shopper in the microfrontend; showing reviews inside the catalog microfrontend is out of scope.

The slice has these parts:

1. A provider microfrontend named `reviews`, registered in the shell and rendered by it. It uses the components and theme from `@storefront/ui`.
2. A NestJS microservice for reviews as its own application. The gateway talks to it through the NestJS microservices TCP transport; the microservice exposes no HTTP API of its own.
3. The gateway HTTP routes the microfrontend calls (list a product's reviews with its average rating, add a review), which forward to the microservice. Invalid input answers 400.
4. One typed contract shared by the microfrontend, the gateway and the microservice, following the contract library convention.
5. Tests on both sides: the microservice's handlers, the gateway routes, and the microfrontend's rendering of the reviews with the client mocked.

Done means `npm run lint`, `npm run typecheck` and `npm run test` all pass from the repository root. Do not commit.
