The `promotions` feature is in place as a full-stack slice. `npm run lint`, `npm run typecheck` and `npm run test` all pass from the root, and `nx sync:check` reports the workspace up to date. I didn't start the services or the shell, so the slice hasn't been run end to end. Nothing is committed.

I created the skeleton with `builder execute default:feature --name=promotions`, then ran `npm install` and wrote the domain on top of it. It picked port 3104 for the microfrontend and TCP port 4104 for the service.

- **Contract:** `@storefront/promotions-contract` holds the `Promotion` and `ValidationResult` types, the `list` and `validate` patterns, the service token and the default port.
- **Service:** `promotions-service` keeps three seed promotions in memory: `WELCOME10`, `SUMMER20` and `VIP50`. Code matching ignores case and surrounding spaces. An unknown code replies `null`. A missing code, or an amount that isn't a non-negative integer, throws `RpcException` with status 400.
- **Gateway:** `GET /api/promotions` lists the promotions. `POST /api/promotions/validate` takes `{ code, amount }` and answers 404 for an unknown code. The 400 comes from the service through `RpcErrorFilter`.
- **Microfrontend:** `promotions` shows the promotion list and a form to check a code against an amount. It uses the `@storefront/ui` components, and the shell registers and renders it.
- **Tests:** the service handlers, the gateway routes, and the microfrontend rendering with the client mocked.
- **README:** I added the layout rows, the two `nx serve` rows and a convention line for the promotions routes.

Amounts are in minor units (cents), as in orders. The form takes dollars and converts them before calling the gateway.

I made the validate route a `POST` with a body, not a `GET` with query parameters. Say if you'd prefer the query form.
