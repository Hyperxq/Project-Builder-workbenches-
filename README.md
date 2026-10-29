# Project Builder — Workbenches

Hands-on experiments comparing AI coding performance **with** and **without** deterministic code generation ([Project Builder](https://github.com/Project-Builder-Schematics) schematics).

This repo is built to be **run by you**. Each workbench ships two arms of the same project — one with schematics, one without — so you can give both the same task, watch them work, and see the difference for yourself.

## Why this exists

AI output varies between runs: the same prompt does not guarantee the same code. Teams write best practices, patterns and reference implementations, and every new feature still depends on how well the agent reads and follows them.

A schematic is deterministic: given the same inputs, it produces the same output, in seconds, following the patterns it encodes. The idea under test is to **complement** the AI, not replace it: the schematic generates the repeatable part of a task (scaffolding, layers, wiring, tests), and the AI writes the part a template cannot express (the inputs, the business logic, the relations).

How large the repeatable part is differs per project, and so does whether handing it to a schematic pays off. Each workbench measures it instead of assuming it, so anyone can check the claim on their own machine.

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

Workbench 01 measured running a pre-built schematic. Workbench 02 measures the claim behind it: **the schematic doesn't exist yet** — the `with-schematics` arm starts from a bare `builder init` (workspace wired, zero templates) and must AUTHOR its own generator during batch 1, while `without-schematics` implements everything by hand. 14 entities in three tiers (vanilla CRUD, real-world quirks, heavy workflows) across 5 clean-room batches measure the amortization curve: the cost of the first iteration, the cost of the ones after it, and whether authoring ever pays for itself.

**Task**: build the admin CRUD modules specified in `entities-benchmark.txt` over an identical base app (Linear design language via `DESIGN.md`, clean architecture per `AGENTS.md`, Authors reference module included, all gates green at the starting commit).

**Definition of done** (per entity, all four green):

```bash
pnpm typecheck && pnpm lint && pnpm test:run && pnpm test:e2e
```

Full experiment design, protocol, and metrics: [`workbench-02-react-admin/README.md`](./workbench-02-react-admin/README.md).

## Workbench 03 — React Admin (Plan-Time Crystallization)

**Stack**: same app as workbench 02, run by a mixed-model harness — Claude Opus 5 orchestrator + Claude Sonnet 5 sub-agents (`scout` pattern explorer, `mechanic` implementer)

Workbench 02 showed that schematizing everything from batch 1 never amortizes: +48% cost for the same final quality — with one reliability signal in its favor: the with-schematics arm passed the definition of done on the first attempt in 9/10 runs vs 5/10 without. Workbench 03 tests whether the value lives in the **decision, not the artifact**: both arms run the exact same autonomous light harness (`HARNESS.md`: plan → build → verify, with a mandatory plan artifact before any code). The ONLY difference is a plan directive in the `with-schematics` arm — a crystallization lifecycle where schematics are extracted from proven, gates-green code (never invented ahead of it): established pattern repeating ≥3 times → extract before building the repeats; unproven pattern → hand-build the first instance, prove it, then extract; every decision recorded in the plan file for post-hoc audit.

**Task and definition of done**: identical to workbench 02 (same base app, entities, tiers, and batch schedule), so its sweeps remain valid historical baselines. Arms are never edited by hand — `derive-arms.sh` regenerates both from `base/` plus a delta overlay, making the inter-arm diff the experiment's documentation.

Full experiment design, predictions, and run instructions: [`workbench-03-react-admin-harness/README.md`](./workbench-03-react-admin-harness/README.md).

## Workbench 04 — Storefront microfrontends

**Stack**: Nx 24 · React 19 with rsbuild Module Federation · Tailwind v4 + shadcn · NestJS 11 microservices over TCP · NestJS gateway · Claude Sonnet 5.5, then Claude Opus 5.5, one headless agent per run in a fresh container

Workbenches 01 to 03 compare against an agent writing each layer by hand. Workbench 04 compares against an agent that can read and copy three working examples of the same full-stack slice (provider microfrontend, TCP microservice, contract library, gateway routes, tests). The schematic was extracted from those examples after they had been reviewed and run end to end. Three new features ran 3 times per arm.

**Result**: the first schematic failed the decision rule on review: its arm needed four review rounds against one, and five of its nine blocking findings came from the schematic itself. After those defects were fixed, the with-schematics arm used 72% fewer tokens and 34% less agent time than the copying arm, with equal structural deviations and equal review rounds. The agents without the schematic did not use the Nx generators; they copied an existing feature, which matched the schematic's structure. Rerun on Claude Opus 5.5 with `@pbuilder/sdk` 0.12.0, both arms again, the with-schematics arm used 61% fewer tokens and 30% less agent time, and both arms passed every check and the end-to-end probe.

**Definition of done** (per feature, all green, plus an end-to-end probe after `npm ci`):

```bash
npm run lint && npm run typecheck && npm run test && npx nx sync:check
```

Full design, results and caveats: [`workbench-04-storefront-microfrontends/README.md`](./workbench-04-storefront-microfrontends/README.md).

## Results dashboard

[`results-dashboard/`](./results-dashboard/) renders every `workbench-*/results/*/bench.json` scorecard: side-by-side arm comparisons per workbench, and for batched experiments the amortization charts (cumulative + marginal cost, break-even batch). Deployed automatically to **GitHub Pages** on every push to `main` — only the tiny `bench.json` scorecards are committed; heavy run artifacts (agent streams, gate logs) stay local. Agents can read the same results as plain markdown at [`llms.txt`](https://hyperxq.github.io/Project-Builder-workbenches-/llms.txt): the latest experiment of each workbench first, the rest under History, regenerated on every deploy.

```bash
cd results-dashboard && pnpm install && pnpm dev   # http://localhost:3020
```

## Adding a workbench

Future workbenches follow the same convention: `workbench-NN-<name>/` containing a `with-schematics/` and a `without-schematics/` arm sharing an identical task specification and definition of done. Add a `workbench.json` at the workbench root (`title`, `stack`, `about`, `proves`, and its `experiments` — see [`results-dashboard/README.md`](./results-dashboard/README.md#experiments)); the results dashboard opens each workbench with those hypotheses and their computed results.
