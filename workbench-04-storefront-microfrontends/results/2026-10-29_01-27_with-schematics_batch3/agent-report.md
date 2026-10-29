I've added the `promotions` feature as a full-stack slice. `npm run lint`, `npm run typecheck` and `npm run test` all pass from the repository root, and `npx nx sync:check` reports project references up to date. Nothing is committed.

I generated the skeleton with `builder execute default:feature --name=promotions` and ran `npm install`. That created the three projects and the gateway controller and wired them in: shell `PROVIDERS` and `App.tsx`, the gateway `ClientsModule`, workspaces and TypeScript references. The ports are 3104 for the microfrontend and TCP 4104 for the service. After that I wrote the domain code:

- **Contract** (`packages/promotions-contract`): the `Promotion` type (code, description, percentage off), the validation request and reply types, and the two message patterns, list and validate. Amounts are in cents, like cart and orders.
- **Microservice** (`apps/promotions-service`): three seed promotions held in memory, `WELCOME10`, `SPRING20` and `HALFTOTE`.
  - Codes match regardless of case and surrounding spaces.
  - The discount is the amount times the percentage, rounded to the nearest cent; the reply also gives the amount after it.
  - An unknown code replies `null`. A missing code, or an amount that isn't a whole number of cents of zero or more, is rejected with `RpcException({ statusCode: 400, message })`.
- **Gateway routes**:
  - `GET /api/promotions` lists the promotions.
  - `POST /api/promotions/:code/validate` takes `{ amount }`. It answers 200 rather than 201 because checking a code changes nothing, and 404 for an unknown code. Bad input comes back as 400 through the existing `RpcErrorFilter`.
- **Microfrontend** (`apps/promotions`): built with `@storefront/ui` components.
  - It shows the promotions as cards with the code, a percentage-off badge and the description.
  - A form takes a code and an amount in dollars, then shows the discount and what the shopper pays.
  - Errors from the gateway, such as "Promo code NOPE not found", appear in an alert. An amount that can't be read as dollars is caught before any request is sent.
- **Tests**:
  - Service handlers: 10 tests covering the list, the discount maths and rounding, the case-insensitive match, unknown codes, 400 errors and the message patterns.
  - Gateway: 7 tests. Some call the controller directly, as the cart and orders tests do. The others start the controller on a local port with the real error filter and check over HTTP that it answers 200, 404 and 400. The repo has no `supertest`, so these use Node's built-in `fetch`.
  - Microfrontend: 6 tests with the client mocked, covering rendering, the empty and error states, a successful check, an unknown code and an invalid amount.
- **README**: layout rows for the three projects, a promotions entry in the service conventions, and the two `serve` commands.

Two behaviours you might not assume: every seed promotion counts as active, since there is no "inactive" flag; and applying a code to the cart is not built, as you specified.
