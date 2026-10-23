The `promotions` feature is in as a full-stack slice. `npm run lint`, `npm run typecheck` and `npm run test` all pass from the repository root. I didn't commit, and I haven't run the services or the shell, so the UI and the TCP wiring are untested end to end.

I generated the skeleton with `builder execute default:feature --name=promotions`, then ran `npm install` and wrote the domain on top.

- **Contract** (`@storefront/promotions-contract`): `Promotion`, `PromotionValidation`, the validate body and payload types, `PROMOTIONS_PATTERNS` (`list`, `validate`), the service token and port 4104.
- **Service** (`promotions-service`): three seed promotions held in memory, which are `WELCOME10`, `SPRING20` and `VIP30`. Codes are case-insensitive. A missing code or an amount that isn't a non-negative integer in minor units is rejected with an `RpcException` carrying `statusCode: 400`. An unknown code replies `null`.
- **Gateway**: `GET /api/promotions` and `POST /api/promotions/validate` with `{ code, amount }`. The validate route answers 404 when the service replies `null`, and 400 comes from the service's rejection.
- **Microfrontend** (`promotions`, port 3104): lists the promotions and has a form that checks a code against an amount in dollars. It shows the discount and the new total, or the error. It uses the `@storefront/ui` components.
- **Tests**:
  - **Service:** handler tests for the list, validation, the null reply and the 400 cases.
  - **Gateway:** route tests for forwarding and the 404.
  - **Microfrontend:** tests with `./client` mocked, covering the list, a load error, a successful check and an unknown-code error.
- **README**: I added table rows for the new projects, a convention bullet for the routes, and `nx serve` rows for the service and the microfrontend. I wrote the README edit with a script that guesses at insertion points, so check the three new table rows. They may not line up with the existing column widths.

I ran `npx nx sync` and Prettier over the new files.
