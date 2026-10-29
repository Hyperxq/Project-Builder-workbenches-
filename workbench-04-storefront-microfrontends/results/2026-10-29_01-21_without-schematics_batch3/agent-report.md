The `promotions` slice is in place, and `npm run lint`, `npm run typecheck` and `npm run test` all pass from the root. `nx sync:check` reports project references up to date. Nothing is committed.

**What I added** (made with the three generators, then finished by hand as the README describes)
- **Contract** `packages/promotions-contract`: the `Promotion` type (code, description, `percentOff`), the request type, `PromotionValidation`, the message patterns, the service token, and a default port of 4104. I removed the generator's `type: module` and sample code, and added `nx.name`.
- **Microservice** `apps/promotions-service`: TCP only, listening on `PROMOTIONS_SERVICE_PORT` (default 4104). It holds three seed promotions in memory: `WELCOME10`, `SUMMER15` and `LOYAL25`. A missing or empty code, or an amount that isn't a whole number ≥ 0, is rejected with `RpcException({ statusCode: 400, … })`. An unknown code replies `null`. The jest setup is copied from the existing services.
- **Gateway**: one new client reading `PROMOTIONS_SERVICE_HOST` and `PROMOTIONS_SERVICE_PORT`, and a controller with two routes:
  - `GET /api/promotions` lists the promotions.
  - `POST /api/promotions/validate` takes `{ code, amount }`. It answers 200 with `{ promotion, amount, discount, discountedAmount }`, or 404 when the service replies `null`.
- **Microfrontend** `apps/promotions` on port 3104, registered in the shell's `PROVIDERS` and rendered in a `ProviderBoundary`. It shows the promotion list (with a "Use" button that fills in the code) and a form to check a code against an amount, built with `@storefront/ui` components.
- **Tests**: 10 for the service handlers, 5 for the gateway routes, and 7 for the microfrontend with the client mocked.

I also started the built service and gateway and sent real HTTP requests to them. The routes answered 200, 404 and 400 as expected, with the 400 passing from the service through `RpcErrorFilter`.

**Decisions you may want to change**
- **Validate is a POST with a JSON body, not a GET with a query string.** That keeps `amount` a real number. Because it creates nothing, it answers 200 instead of POST's default 201.
- **Amounts are integer cents**, like the other features. The form takes dollars ("49.99") and converts them. The discount is `round(amount × percentOff / 100)`.
- **Codes match ignoring case and surrounding spaces**, so `" welcome10 "` finds `WELCOME10`.
- There's no currency field: the microfrontend formats amounts as USD, the same currency the other services use.

**Generator side effects I undid:** the e2e project, the `axios` dependency, the jest exclusion in `nx.json`, and a new debug entry in `.vscode/launch.json`. `package-lock.json` is updated to match. I also added the new projects, routes and ports to the README.
