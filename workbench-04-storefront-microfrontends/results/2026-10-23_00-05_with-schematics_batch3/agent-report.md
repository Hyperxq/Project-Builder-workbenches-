I added the `promotions` feature, and `npm run lint`, `npm run typecheck` and `npm run test` all pass from the repo root. `nx sync` reports the project references are up to date. I haven't started the apps or tried it in a browser, and nothing is committed.

I generated the skeleton with the `default:feature` schematic, as the repo instructions say, then ran `npm install`. It put the microfrontend on port 3104 and the service on TCP port 4104, and registered the feature in the shell, gateway module, workspaces, references and README. I then wrote the domain code on top.

- **Contract** (`packages/promotions-contract`): the `Promotion`, validate body/payload and `PromotionValidation` types, plus the `list` and `validate` message patterns.
- **Service** (`apps/promotions-service`):
  - Three seed promotions are held in memory: `WELCOME10`, `SUMMER20` and `VIP50`.
  - Codes match case-insensitively and ignore surrounding spaces.
  - A blank code or an amount that isn't a non-negative integer throws `RpcException` with status 400.
  - An unknown code replies `null`.
- **Gateway** (`apps/gateway`): `GET /api/promotions` lists promotions. `POST /api/promotions/validate` takes `{code, amount}` and answers 404 when the service replies `null`. Bad input reaches the service and comes back as 400 through the existing `RpcErrorFilter`.
- **Microfrontend** (`apps/promotions`): it lists the promotions as cards using `@storefront/ui`, with a form to check a code against an amount. The result shows the discount and the new total.
- **Tests**: the service handlers, the gateway routes (including the 404), and the microfrontend rendering with the client mocked.

Amounts are integer cents, like the orders feature. The form takes dollars and converts them. The service rounds the discount to the nearest cent.

I ran Prettier over the generated files, which also reformatted the schematic's output in the gateway module and the shell.
