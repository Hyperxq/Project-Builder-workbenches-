# Storefront feature slices

A feature in this storefront is one full-stack slice: a provider microfrontend `apps/<name>`, a NestJS TCP microservice `apps/<name>-service`, a contract library `packages/<name>-contract`, a gateway controller in `apps/gateway`, and tests on both sides. `catalog`, `cart` and `orders` are complete examples; copy their shape and conventions, documented in `README.md`.

The Nx generators create the projects: `nx g @nx/react:provider apps/<name> --bundler=rsbuild --consumer=shell`, `nx g @nx/nest:app apps/<name>-service`, and `nx g @nx/js:lib packages/<name>-contract --bundler=none`. They do not create this repository's whole shape: the README lists the steps each one leaves to do by hand (shell registration, the port, the config files copied from `catalog`, removing the generated e2e project, the contract module settings, workspaces and project references).

Services reject bad input with `RpcException({ statusCode: 400, message })`; the gateway's `RpcErrorFilter` turns it into the HTTP status. Before finishing, run `npx nx sync` if `npx nx sync:check` reports stale project references.
