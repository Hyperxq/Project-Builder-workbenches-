The `promotions` feature is in as a full-stack slice. `npm run lint`, `npm run typecheck` and `npm run test` all pass from the root, and `nx sync:check` reports the workspace up to date. Nothing is committed.

I used the `default:feature` schematic and ran `npm install`. It created the three projects and the gateway controller, and registered them in the shell, the gateway module, the workspaces, the project references and the README. The ports are 3104 for the microfrontend and 4104 for the service. I then wrote the domain code.

- **Contract:** `@storefront/promotions-contract` holds `Promotion`, the validation body and result types, `PROMOTIONS_PATTERNS` (`list`, `validate`), the service token and the default port.
- **Service:** `promotions-service` keeps three seed promotions in memory: `WELCOME10` (10%), `SPRING20` (20%) and `VIP50` (50%).
  - Codes match case-insensitively, and the discount is rounded to the nearest cent.
  - An unknown code replies `null`.
  - A missing code, or an amount that isn't a non-negative integer, is rejected with an `RpcException` carrying `statusCode: 400`.
- **Gateway:** `GET /api/promotions` lists the promotions. `POST /api/promotions/validate` takes `{ code, amount }` and answers 404 for an unknown code. A bad body comes back as 400 from the service.
- **Microfrontend:** `promotions` lists each promotion with its description and percentage off. It also has a form to check a code against a dollar amount, which shows the discount and the total. It uses `@storefront/ui` components.
- **Tests:** the service handlers, the gateway routes, and the microfrontend rendering with the client mocked.

I chose `POST` for validation, and amounts are in cents, the same unit the other contracts use for prices. The form takes dollars and converts them to cents before calling the gateway.
