The `promotions` feature is in place as a full-stack slice, and `npm run lint`, `npm run typecheck` and `npm run test` all pass from the repository root. `npx nx sync:check` reports the project references are up to date. Nothing is committed.

I generated the skeleton with `builder execute default:feature --name=promotions` and ran `npm install`. It wired the feature into the shell, the gateway module, the workspaces and the TypeScript references, on ports 3104 (microfrontend) and 4104 (service). I compared the generated files with `orders` and they match its shape.

**API**
- `GET /api/promotions` returns the promotions (code, description, percentage off). It never answers 404.
- `POST /api/promotions/:code/validate` with body `{ "amount": 4999 }` returns the promotion, the `discount` and the `discountedAmount`.
  - Amounts are in cents, as in `cart` and `orders`, and the discount is rounded to the nearest cent.
  - Codes match regardless of case or surrounding spaces.
  - It answers 200 rather than POST's usual 201, because nothing is created.
  - An unknown code answers 404.
  - A missing code, or an amount that isn't a whole number of 0 or more, answers 400. The service rejects it with `RpcException({ statusCode: 400, message })` and the gateway's `RpcErrorFilter` turns that into the HTTP status.

I used POST with a JSON body rather than `GET ?amount=` so the amount arrives as a number and doesn't have to be converted from a string.

**What I wrote**
- **Contract:** the promotion and result types, the request body and payload, and the two message patterns (`promotions.list`, `promotions.validate`).
- **Service:** three seed promotions in memory (`WELCOME10`, `SPRING20`, `FRIENDS15`) and the two handlers. It has no HTTP API of its own.
- **Gateway:** the two routes above, which forward to the service over TCP.
- **Microfrontend:** a list of promotions with a "Use" button that fills in the code, and a form that checks a code against an amount in dollars and shows the discount and the amount after it. Error messages from the gateway, such as "Promotion NOPE not found", are shown to the shopper. It uses the `@storefront/ui` components.
- **README:** rows for the three new projects, a conventions entry for the routes, and the `serve` commands.

**Tests**
- **Service (10):** listing, the discount maths and rounding, case-insensitive matching, unknown code returns `null`, the 400 rejections, and the message patterns.
- **Gateway (7):** unit tests for forwarding and the 404. Supertest isn't installed, so the HTTP-level tests start the gateway controller on a random port and call it with Node's `fetch`. They check the real 200, 404 and 400 status codes through `RpcErrorFilter`.
- **Microfrontend (6), with the client mocked:** rendering the list, the empty and error states, a code check, the unknown-code message, and an invalid amount that never reaches the gateway.

Lint prints an "unused eslint-disable directive" warning in each service's `jest.config.cts`. It's not an error, and the new service's file is a copy of the existing ones, so I left it alone.
