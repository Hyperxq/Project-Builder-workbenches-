# Storefront

A small storefront built as React microfrontends over NestJS services, in one Nx workspace.

## Layout

| Path                        | Project                        | Tags                          | What it is                                                                                                              |
| --------------------------- | ------------------------------ | ----------------------------- | ----------------------------------------------------------------------------------------------------------------------- |
| `apps/shell`                | `shell`                        | `type:app`, `scope:web`       | Module Federation consumer that loads every feature microfrontend at runtime                                            |
| `apps/gateway`              | `gateway`                      | `type:app`, `scope:api`       | NestJS gateway in front of the feature services                                                                         |
| `packages/ui`               | `@storefront/ui`               | `type:ui`, `scope:web`        | Shared components (shadcn on Radix) and the Tailwind theme                                                              |
| `apps/catalog`              | `catalog`                      | `type:app`, `scope:web`       | Provider microfrontend: product grid and product detail (port 3101)                                                     |
| `apps/catalog-service`      | `catalog-service`              | `type:app`, `scope:api`       | NestJS TCP microservice holding the in-memory seed products (TCP port 4101)                                             |
| `apps/cart`                 | `cart`                         | `type:app`, `scope:web`       | Provider microfrontend: the shopper's cart, with its id kept in `localStorage` (port 3102)                              |
| `apps/cart-service`         | `cart-service`                 | `type:app`, `scope:api`       | NestJS TCP microservice holding in-memory carts keyed by cart id (TCP port 4102)                                        |
| `apps/orders`               | `orders`                       | `type:app`, `scope:web`       | Provider microfrontend: the shopper's orders (list and detail), with its customer id kept in `localStorage` (port 3103) |
| `apps/orders-service`       | `orders-service`               | `type:app`, `scope:api`       | NestJS TCP microservice holding in-memory orders keyed by customer id (TCP port 4103)                                   |
| `packages/catalog-contract` | `@storefront/catalog-contract` | `type:shared`, `scope:shared` | `Product` type and message patterns shared by `catalog`, `gateway` and `catalog-service`                                |
| `packages/cart-contract`    | `@storefront/cart-contract`    | `type:shared`, `scope:shared` | `Cart`, `CartLine`, payloads and message patterns shared by `cart`, `gateway` and `cart-service`                        |
| `packages/orders-contract`  | `@storefront/orders-contract`  | `type:shared`, `scope:shared` | `Order`, `OrderLine`, `OrderSummary`, payloads and message patterns shared by `orders`, `gateway` and `orders-service`  |

Features are added as provider microfrontends next to `shell` and services next to `gateway`.

## Conventions

### Microfrontends

- A provider is created with `nx g @nx/react:provider apps/<name> --bundler=rsbuild --consumer=shell`.
- `<name>` is kebab-case and is the project name and the provider's `alias` in `apps/shell/src/mf.ts`.
- The federation `name` is the same word in snake_case (`product-catalog` becomes `product_catalog`).
- The generator does not touch the shell: add the provider to `PROVIDERS` and `App.tsx` by hand, then copy `eslint.config.mjs`, `postcss.config.mjs`, `vite.config.mts`, `src/env.d.ts`, `src/styles.css`, the `typecheck` target and tags of `apps/catalog` (it adds no vitest, ui or contract setup), and add `@storefront/ui` and the feature contract to the provider's `package.json`.
- The provider generator does not check ports: it writes 3101 into `rsbuild.config.ts` and `package.json` every time. Set the next free port in both by hand.
- Every provider is listed in the `PROVIDERS` array of `apps/shell/src/mf.ts` and rendered inside a `ProviderBoundary` in `apps/shell/src/App.tsx`.
- The shell serves on port 4200. Providers take ports from 3101 upward, and no two providers share one.

### Services

- A service is created with `nx g @nx/nest:app apps/<name>-service --tags="type:app,scope:api"` and set `nx.name` in its `package.json` to `<name>-service`. It is a NestJS microservice on the TCP transport and exposes no HTTP API; only `gateway` serves HTTP.
- Service TCP ports start at 4101, one per service, and are not reused. The port is read from `<NAME>_SERVICE_PORT` (snake upper case, e.g. `CATALOG_SERVICE_PORT`) and defaults to a `<NAME>_SERVICE_DEFAULT_PORT` constant from the feature's contract. The gateway also reads `<NAME>_SERVICE_HOST` (default `localhost`).
- The gateway registers one `ClientsModule` client per service, injected with the contract's `<NAME>_SERVICE` token, and exposes REST routes under its `api` prefix (for the catalog: `GET /api/products`, `GET /api/products/:id`) that forward with `client.send`. It listens on 3000 with CORS enabled.
- A microfrontend calls the gateway at `PUBLIC_GATEWAY_URL` (default `http://localhost:3000/api`).
- A new service must be added to the root `package.json` `workspaces`; delete the `-e2e` project the generator creates, and copy `jest.config.cts`, `tsconfig.spec.json` and `.spec.swcrc` from `catalog-service`.
- REST routes with a message that targets an entity inside a collection answer 404 when the service replies `null` (e.g. the cart: `GET /api/cart/:cartId`, `POST /api/cart/:cartId/lines`, `PATCH` and `DELETE /api/cart/:cartId/lines/:productId`). `GET` of a cart never 404s: an unknown cart id is an empty cart.
- Orders (`POST /api/orders/:customerId`, `GET /api/orders/:customerId`, `GET /api/orders/:customerId/:orderId`) are keyed by a customer id (a UUID the `orders` microfrontend stores in `localStorage`). Listing never 404s: an unknown customer has no orders. Getting an order the customer does not have answers 404.
- The service generator also adds `axios` to the root `package.json`, an `-e2e` project and `jest` exclusions in `nx.json`; revert those, and wire the service into the root `tsconfig.json` references.
- State is in memory in the service; a client-held id (the cart id, a UUID the microfrontend stores in `localStorage`) keys it. Services validate their payloads and reject bad input with `RpcException({ statusCode: 400, message })`, never an HTTP exception such as `BadRequestException`: HTTP exceptions do not cross the TCP transport and reach the shopper as 500. The gateway's `RpcErrorFilter` turns that shape back into the HTTP status.
- Message handlers use `@MessagePattern(<NAME>_PATTERNS.x)`; a lookup that finds nothing replies `null` and the gateway answers 404.

### Contract libraries

- Each feature has one contract library, `packages/<name>-contract`, imported as `@storefront/<name>-contract`, created with `nx g @nx/js:lib packages/<name>-contract --bundler=none --unitTestRunner=none --importPath=@storefront/<name>-contract --tags="type:shared,scope:shared"` and named `<name>-contract` in `nx.name`.
- It holds only types and constants (entity types, `<NAME>_PATTERNS`, the `<NAME>_SERVICE` token, the default port) with no runtime dependencies. Microfrontends, the gateway and the service all import it, and consumers list it as `"@storefront/<name>-contract": "*"` in their `package.json`.
- Use extensionless relative imports inside it (no `type: module`) so Jest, Vitest and webpack all resolve it.

### Module boundaries

`@nx/enforce-module-boundaries` in `eslint.config.mjs` enforces the tags above:

- an app depends only on `type:ui` and `type:shared` libraries;
- a UI library depends only on `type:ui` and `type:shared` libraries;
- `type:shared` and `scope:shared` libraries depend only on other shared libraries;
- `scope:web` code never imports `scope:api` code, and the reverse.

### Design

`DESIGN.md` is the design system. It is the Shopify-inspired analysis from [awesome-design-md](https://github.com/voltagent/awesome-design-md) (MIT) at commit `3b605329240ce735b510037cca322f1831fdd7f8`. The storefront uses its transactional track: cream canvas, black ink, aloe and pistachio accents, pill buttons and Inter. The tokens live in `packages/ui/src/styles/theme.css`; every app imports that file after `tailwindcss` and adds `@source` for `packages/ui/src`.

## Commands

| Command                        | Runs                                                  |
| ------------------------------ | ----------------------------------------------------- |
| `npm run lint`                 | ESLint, including module boundaries, on every project |
| `npm run typecheck`            | TypeScript on every project                           |
| `npm run test`                 | Vitest (web) and Jest (api) on every project          |
| `npm run build`                | Every build                                           |
| `npm run check`                | All of the above                                      |
| `npx nx serve shell`           | The shell on port 4200                                |
| `npx nx serve gateway`         | The gateway                                           |
| `npx nx serve catalog-service` | The catalog microservice (TCP)                        |
| `npx nx serve catalog`         | The catalog microfrontend on port 3101                |
| `npx nx serve cart-service`    | The cart microservice (TCP, port 4102)                |
| `npx nx serve cart`            | The cart microfrontend on port 3102                   |
| `npx nx serve orders-service`  | The orders microservice (TCP, port 4103)              |
| `npx nx serve orders`          | The orders microfrontend on port 3103                 |
