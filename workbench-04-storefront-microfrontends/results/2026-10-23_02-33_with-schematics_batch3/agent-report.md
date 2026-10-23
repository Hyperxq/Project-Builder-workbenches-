The `promotions` slice is in place, and `npm run lint`, `npm run typecheck` and `npm run test` all pass from the repo root. I didn't commit, and I didn't run the services or the microfrontend, so none of it has been exercised against a live gateway.

I generated the skeleton with the `default:feature` schematic and ran `npm install`. The ports are 3104 for the microfrontend and 4104 for the service. `npx nx sync` reported everything up to date. Then I wrote the domain parts:

- **Contract:** `packages/promotions-contract` holds the `Promotion`, `PromotionValidation` and `ValidatePromotionBody` types, the `list` and `validate` message patterns, the service token and the default port.
- **Service:** `promotions-service` holds three seed promotions in memory: `WELCOME10` (10%), `SPRING20` (20%) and `VIP30` (30%). Codes match case-insensitively. `validate` replies `null` for an unknown code and throws `RpcException` with 400 for a missing code or a non-integer or negative amount.
- **Gateway:** `GET /api/promotions` lists the promotions. `POST /api/promotions/validate` takes `{ code, amount }` and answers 404 for an unknown code.
- **Microfrontend:** `apps/promotions` lists the promotions and has a form to check a code against an amount. It uses `@storefront/ui`.
- **Tests:** the service handlers, the gateway routes and the microfrontend rendering with the client mocked.
- **README:** I added the layout rows, a conventions bullet for the routes, and the `nx serve` rows.

I made two choices the brief left open. Amounts are integers in minor units, like the rest of the storefront. The form takes dollars and converts to cents before calling the gateway.
