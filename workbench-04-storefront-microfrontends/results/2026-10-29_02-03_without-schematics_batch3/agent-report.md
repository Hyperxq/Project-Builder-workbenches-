I've added the `promotions` feature as a full slice. `npm run lint`, `npm run typecheck` and `npm run test` all pass from the root, and `npx nx sync:check` reports nothing out of date. I also started the real service and gateway and called the routes over TCP: the list returns 200, a known code returns its discount, an unknown code returns 404, and a negative or missing amount returns 400. Nothing is committed.

**Routes**
- `GET /api/promotions` returns the promotions, each with a code, description and percentage off.
- `POST /api/promotions/:code/validate` takes `{ "amount": 4000 }` and returns the discount and the amount after it.
- Amounts are in cents, like everywhere else in the storefront.
- Codes match regardless of case and surrounding spaces.
- The discount is rounded to the nearest cent.
- The validate route returns 200 rather than 201, because checking a code doesn't change anything.

**What was added**
- **Contract** (`packages/promotions-contract`): the shared types, the message patterns, the `PROMOTIONS_SERVICE` token and default port 4104.
- **Microservice** (`apps/promotions-service`): TCP only, with three seed promotions (`WELCOME10`, `SPRING15`, `FRIENDS25`) held in memory. An unknown code returns `null`, and bad input is rejected with a 400 `RpcException`.
- **Gateway**: a new controller and a client for the service, which reads `PROMOTIONS_SERVICE_HOST` and `PROMOTIONS_SERVICE_PORT`. An unknown code becomes a 404 here.
- **Microfrontend** (`apps/promotions`, port 3104): registered in the shell and built from `@storefront/ui` components. It lists the promotions, and a form checks a code against an amount typed in dollars. A "Use" button next to each promotion fills in its code. An unknown code shows "Promo code X is not valid."

**Tests**
- 10 for the microservice's handlers, including rounding, case matching, null for unknown codes, rejected input and the message patterns.
- 5 for the gateway routes, including forwarding and the 404. They test the controller directly, like the existing gateway tests, rather than over HTTP.
- 7 for the microfrontend with the client mocked: rendering, empty and error states, a check, an unknown code, and an invalid amount.

**Steps the generators left, done by hand as the README says**
- Removed the `promotions-service-e2e` project and undid the extra `axios` dependency and `nx.json` change.
- Regenerated `package-lock.json` from the committed version.
- Made the contract use `nx.name` and extensionless imports, without `type: module`.
- Copied the catalog config files into both new apps.
- Set port 3104 in both places, since the generator always writes 3101.
- Added the workspace entries and project references.

**Choices you may want to revisit**
- I didn't keep the VS Code debug entry the generator added for the service, since `orders-service` doesn't have one. It's a one-line restore if you want it.
- I added the feature to the README's layout, conventions and commands tables. Prettier re-aligned the tables, so that diff looks bigger than the actual content change.
