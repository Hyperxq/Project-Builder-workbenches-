# Project Builder — Workbenches

Hands-on experiments comparing AI coding performance **with** and **without** deterministic code generation ([Project Builder](https://github.com/Project-Builder-Schematics) schematics).

This repo is built to be **run by you**. Each workbench ships two arms of the same project — one with schematics, one without — so you can give both the same task, watch them work, and see the difference for yourself.

## Why this exists

AI is inherently variant: running the same prompt twice never guarantees the same output. You can invest hours defining best practices, patterns, and reference implementations — and the next time the AI implements a feature against that same standard, it still starts the whole process from zero and takes just as long. Having a reference does not make the outcome faster, and nothing guarantees the result will even work.

Schematics attack exactly that gap. A schematic is a deterministic tool: given input A, it produces output B — always, in seconds, with zero drift from the established patterns. The point is not to replace the AI but to **complement** it:

- **Schematics** own the repeatable 80%: scaffolding, CRUD layers, tests, wiring — everything that must follow the standard identically every time.
- **AI** owns the judgment 20%: writing the schema that drives the generator, custom business logic, relations, and everything a template cannot express.

These workbenches exist so anyone can test that claim on their own machine instead of taking it on faith.

## Structure

Each workbench is a head-to-head comparison: two copies of the same starting point, one arm equipped with schematics, the other left to the AI alone. Both arms receive the **same task list** and the **same definition of done**.

```
workbench-01-nest-graphql-api/
├── with-schematics/      # NestJS GraphQL API + Project Builder schematics
└── without-schematics/   # Same stack, no generators — AI implements everything by hand
```

## Workbench 01 — NestJS GraphQL API

**Stack**: NestJS 11 · code-first GraphQL (Apollo Server 5) · Mongoose 9 · Jest · Bruno

**Task**: implement a complete GraphQL CRUD endpoint (create, list, get by key, update, remove) for each of the 15 entities specified in `entities-benchmark.txt` (present in both arms), including unit tests, e2e tests, and a Bruno request collection.

**Definition of done** (per endpoint, all four green):

```bash
pnpm exec tsc --noEmit && pnpm lint && pnpm test && pnpm test:e2e
```

| Arm | How endpoints are built |
|---|---|
| `with-schematics` | AI writes the Mongoose schema; `builder execute default:resource` deterministically generates entity, DTOs, repository, service, resolver, module, specs, and Bruno collection |
| `without-schematics` | AI reads the same conventions and implements every layer by hand, endpoint by endpoint |

### Run it yourself

Prerequisites: Node.js 20+, [pnpm](https://pnpm.io/), Docker, [Bun](https://bun.sh), and the Project Builder CLI (`brew install project-builder-schematics/tap/pbuilder`) — the CLI is only needed for the `with-schematics` arm.

1. **Set up each arm** (same steps in both folders):

   ```bash
   pnpm install
   cp .env.example .env
   docker compose up -d mongodb
   pnpm start:dev   # GraphQL explorer at http://localhost:3000/graphql
   ```

2. **Pick one or more entities** from `entities-benchmark.txt` — the file is identical in both arms.

3. **Give both arms the exact same prompt** with your AI agent of choice — copy it verbatim, only replacing the entity name. The comparison is only fair if neither arm gets extra hints. For a clean-room agent (no personal config, hooks, or plugins influencing either arm), run Claude Code through the isolated container in [`claude-runner/`](./claude-runner/README.md):

   ```bash
   ARM=with-schematics docker compose -p bench-with run --rm runner
   ```

   The prompt itself stays the same:

   ```text
      Follow the instruction listed on entities-benchmark.txt
   ```

   In `with-schematics` the agent will discover the generator and write only a schema; in `without-schematics` it writes every layer by hand. That difference must emerge from the project, never from the prompt.

4. **Compare** what you observed:

   - **Time** — wall-clock per endpoint.
   - **Tokens / cost** — AI consumption per arm.
   - **Correctness** — did it pass the definition of done on the first attempt, or how many fix iterations did it need?
   - **Consistency** — repeat the task for several entities and compare the outputs within each arm: identical task, identical standard — how identical is the code?

Each arm's own `README.md` documents its stack, architecture, and workflow in detail.

## Workbench 02 — React Admin (Schematic Amortization)

**Stack**: React 19 · Vite 8 · TypeScript strict · Tailwind v4 + shadcn/ui · TanStack Router/Query · Zustand · react-hook-form + Zod v4 · MSW v2 · Playwright + axe

Workbench 01 measured running a pre-built schematic. Workbench 02 measures the claim behind it: **the schematic doesn't exist yet** — the `with-schematics` arm starts from a bare `builder init` (workspace wired, zero templates) and must AUTHOR its own generator during batch 1, while `without-schematics` implements everything by hand. 14 entities in three tiers (vanilla CRUD, real-world quirks, heavy workflows) across 5 clean-room batches expose the amortization curve: heavy first iteration, near-free rest — and the break-even point where authoring pays for itself.

**Task**: build the admin CRUD modules specified in `entities-benchmark.txt` over an identical base app (Linear design language via `DESIGN.md`, clean architecture per `AGENTS.md`, Authors reference module included, all gates green at the starting commit).

**Definition of done** (per entity, all four green):

```bash
pnpm typecheck && pnpm lint && pnpm test:run && pnpm test:e2e
```

Full experiment design, protocol, and metrics: [`workbench-02-react-admin/README.md`](./workbench-02-react-admin/README.md).

## Adding a workbench

Future workbenches follow the same convention: `workbench-NN-<name>/` containing a `with-schematics/` and a `without-schematics/` arm sharing an identical task specification and definition of done.
