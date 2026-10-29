I've added the `promotions` feature as a full slice: a microfrontend, a TCP microservice, a contract library, gateway routes and tests. `npm run lint`, `npm run typecheck` and `npm run test` all pass from the root, `npx nx sync:check` reports nothing stale, and nothing is committed.

**The routes**
- `GET /api/promotions` returns the active promotions, each with code, description and `percentOff`.
- `POST /api/promotions/:code/validate` takes a body of `{ "amount": 4990 }` (in cents, like the rest of the storefront). It answers 200 with the discount and the amount after it (`discount`, `discountedAmount`).
- An unknown code answers 404. A blank code or an amount that isn't a non-negative whole number answers 400; the service rejects it with `RpcException({ statusCode: 400, … })` and the gateway's existing `RpcErrorFilter` turns that into the HTTP status.

**The parts**
- **Contract** (`packages/promotions-contract`): the shared types, message patterns, service token and default port 4104. I removed what the generator added that doesn't fit: the `"type": "module"` setting, the placeholder `lib/` folder, and the missing project name.
- **Service** (`apps/promotions-service`): three seed codes (`WELCOME10`, `SPRING20`, `FRIENDS25`) held in memory, listening on TCP 4104 and overridable with `PROMOTIONS_SERVICE_PORT`. I undid what the generator added on the side: the e2e project, `axios`, the `nx.json` test exclusion and a `.vscode/launch.json` entry.
- **Gateway**: a TCP client for the service (host and port from `PROMOTIONS_SERVICE_HOST` / `PROMOTIONS_SERVICE_PORT`) and the two routes above.
- **Microfrontend** (`apps/promotions`, port 3104): registered in the shell and rendered in its own error boundary. It shows the promotions as cards and has a form to check a code against an amount, built with `@storefront/ui` components.
- **Tests**: 9 for the service, 9 for the gateway and 7 for the microfrontend with the client mocked. Four of the gateway tests send real HTTP requests to check the 200, 404 and 400 statuses.

I also ran the built service and gateway together and hit the routes with curl. List, a valid code, an unknown code, a bad amount, a missing body and a blank code all gave the expected answers, so the 404 and 400 hold over the real connection too.

**Choices you may want to revisit**
- **Validate is a POST that answers 200.** The orders and cart features send their inputs in a request body, so I did the same. Checking a code changes nothing, so it returns 200 rather than POST's usual 201.
- **Codes are matched loosely.** Upper/lower case and surrounding spaces are ignored, so ` spring20 ` works.
- **The discount is rounded to the nearest cent.**
- **Promotions have no currency.** The form takes a dollar amount and shows results in USD, like the rest of the storefront.

The README's layout and commands tables don't list `promotions` yet; I can add those rows if you want.
