The `promotions` feature is in as a full-stack slice. `npm run lint`, `npm run typecheck` and `npm run test` all pass from the repo root, and `nx sync:check` reports nothing stale. I haven't started the services or loaded the microfrontend in a browser, so none of it has been exercised outside the tests. Nothing is committed.

I generated the skeleton with the `default:feature` schematic and ran `npm install`. Then I filled in the domain parts. It picked ports 3104 for the microfrontend and 4104 for the service.

- **Contract:** `@storefront/promotions-contract` holds the `Promotion`, `PromotionValidation` and validate-body types, plus the `list` and `validate` patterns.
- **Service:** `promotions-service` keeps three seed promotions in memory: `WELCOME10`, `SPRING20` and `VIP50`.
  - Validation matches codes case-insensitively and rounds the discount to the nearest minor unit.
  - An unknown code replies `null`.
  - A missing code, or an amount that isn't a non-negative integer, throws `RpcException` with `statusCode: 400`.
- **Gateway:** `GET /api/promotions` lists them, and `POST /api/promotions/validate` takes `{ code, amount }`. An unknown code answers 404 and bad input answers 400.
- **Microfrontend:** `promotions` shows the promotions as cards and has a small form to check a code against an amount. It uses components from `@storefront/ui`. The schematic had already registered it in the shell.
- **Tests:**
  - The service tests cover the handlers and the 400 and null cases.
  - The gateway tests cover forwarding and the 404.
  - The microfrontend tests mock the client and cover rendering the list, a failed load, and validating a code.

The amount is in minor units (cents) everywhere except the form. The form takes dollars and converts them before calling the gateway.

After the code was written, I ran prettier over `README.md` and the new and generated files. Prettier modified `README.md`, so re-read it before editing it.
