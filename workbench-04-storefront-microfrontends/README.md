# Workbench 04 — Storefront microfrontends

**Question**: an agent adds a full-stack feature to a monorepo that already has three working examples of the same shape. Does a Project Builder schematic extracted from those examples make the agent cheaper or faster, at the same quality?

**Stack**: Nx 24 · React 19 with rsbuild Module Federation · Tailwind v4 and shadcn · NestJS 11 microservices over TCP · NestJS HTTP gateway · Vitest and Jest. Design tokens come from the Shopify analysis in [awesome-design-md](https://github.com/voltagent/awesome-design-md).

## The pattern

One storefront feature is one slice with five parts:

1. a provider microfrontend `apps/<name>`, registered in the shell's `PROVIDERS` list and rendered in a `ProviderBoundary`;
2. a NestJS microservice `apps/<name>-service` that speaks only TCP;
3. a contract library `packages/<name>-contract` with the types and message patterns all three sides import;
4. gateway routes that forward to the service, answer 404 when it replies `null` and 400 when it rejects the input;
5. tests on both sides.

Nx generates parts 1 and 2 on their own, but not this repository's shape: the provider generator never touches the shell and always picks port 3101, the Nest generator adds an e2e project and `axios`, and nothing wires the gateway, the workspaces or the project references.

## How it was run

| Phase | What happened |
|---|---|
| 0 | `storefront` created: Nx workspace, shell consumer, shared UI library, gateway, root checks |
| 1 | Headless agents built catalog, cart and orders, one run each, reviewed and merged. An end-to-end check found a defect all three shared (HTTP exceptions thrown inside TCP services reached the shopper as 500) and stale project references; both were fixed by hand before going on |
| 2 | The `feature` schematic was written from the three working slices: 189-line factory, 36 templates, factory tests. At least 21 minutes of agent time |
| 3 | reviews, wishlist and promotions, 3 runs per arm, then a blind review |
| 3b | The schematic's own defects were fixed (v2) and the 9 with-schematics runs were repeated |
| 3c | Both arms rerun, 3 runs per feature, on Claude Opus 5.5 with schematic v2 on `@pbuilder/sdk` 0.12.0; no blind review |

Every run starts from the same commit in a fresh container (`harness/docker`), with no history, no user configuration (`claude -p --bare`) and the same model in both arms: Claude Sonnet 5.5 in phases 3 and 3b, Claude Opus 5.5 in phase 3c. Both arms get the same task prompt (`harness/tasks/phase3-<feature>.md`), which names no generator. The only difference is the arm context:

| Arm | Context (`CONTEXT.md`) |
|---|---|
| `without-schematics` | The slice, the reference features, the Nx generators and the hand steps they leave; `builder` is blocked |
| `with-schematics` | The same text plus the schematic: `builder info default:feature`, then `builder execute default:feature --name=<name>`, then `npm install`, then only the domain |

Each run is scored on cost, tokens, agent time and turns; on the four root checks (lint, typecheck, test, `nx sync:check`); on 20 structural checks against the phase 1 conventions; on an end-to-end probe (`npm ci` from a clean checkout, serve the stack, call every route the agent wrote); and, for one run per feature and arm, on a blind review by an agent reviewer that counts review rounds.

## Results

| Median, n = 9 per arm | without-schematics | with-schematics v1 | with-schematics v2 |
|---|---|---|---|
| Cost | $0.29 | $0.16 | $0.16 |
| Total tokens | 394k | 99k | 112k |
| Agent time | 144 s | 114 s | 95 s |
| Turns | 14 | 8 | 9 |
| Root checks and structural checks | all pass | all pass | all pass |
| End to end, including `npm ci` | 5/9 | 9/9 | 9/9 |
| Blind review: rounds (blocking findings), 3 diffs | 1 (1) | 4 (9) | 1 (1) |

The without-schematics arm was reviewed twice, once against each schematic version, by two different reviewer agents; both gave its three diffs the same rounds (0, 0, 1). The second review counted 2 blocking findings for it; the table shows the first.

**Verdict**: with schematic v2, the with-schematics arm passes the decision rule: 72% fewer tokens and 34% less agent time, with equal structural deviations and equal review rounds. Schematic v1 failed it: five of its arm's nine blocking findings came from the schematic itself (placeholder README rows, a JSON file rewritten with `JSON.stringify`, an unformatted shell entry).

What the numbers do and do not say:

- **The competitor was copying, not Nx.** No without-schematics agent used a generator. All nine copied an existing feature with `cp -r` and renamed it, and reached the same structure and the same review quality. The schematic's measured advantages are cost, time, turns and a clean `npm install`.
- **The `npm ci` failures are an instruction effect as much as a tool effect.** Four without-schematics agents tried `npm install --offline`, which failed, and linked the new workspaces with `ln -s`; their checks passed and their lockfile never learnt about the new projects. The with-schematics context tells the agent to run `npm install`; the other does not.
- **The saving is small per feature**: about $0.13, 49 seconds and 5 turns. Against the time it took to write and fix the schematic, it pays back after roughly 25 to 30 features of this shape.
- **A schematic needs review like any other code.** The first version lost; the measured win belongs to the reviewed one.
- **Samples are small**: 3 runs per cell for the metrics, 1 per cell for the review, agent reviewers only.

### Opus 5.5 rerun (phase 3c)

| Median, n = 9 per arm | without-schematics | with-schematics v2 | Change |
|---|---|---|---|
| Cost | $1.33 | $0.84 | -37% |
| Total tokens | 2.13M | 828k | -61% |
| Agent time | 384 s | 267 s | -30% |
| Turns | 40 | 22 | -45% |
| Root checks | 9/9 | 9/9 | equal |
| Structural deviations (20 checks per run) | 1 | 0 | |
| End to end, including `npm ci` | 9/9 | 9/9 | equal |

**Verdict**: the with-schematics arm passes the hypothesis registered for this rerun (`wb04-sdk012`): 61% fewer tokens and 30% less agent time, with no worse checks. Without a blind review, the review-rounds part of the original decision rule was not measured again.

- **The model is the variable that changed, not the SDK.** The `feature` schematic uses only `@pbuilder/sdk/commons` and no dialect, so none of the operations added since 0.10 come into play. On 0.12.0 it runs unchanged: 11/11 factory tests and a real `builder execute` passing all four root checks.
- **The `npm ci` gap did not repeat.** No without-schematics run on Opus broke the lockfile, so the end-to-end difference from phase 3 belongs to that model, or to that sample.
- **Opus costs more per feature in both arms**, so the absolute saving grows: about $0.49, 116 seconds and 18 turns per feature. Against the 21 minutes of phase 2 authoring, a lower bound that leaves out the v2 fixes, it pays back in time after roughly 11 features.
- **The saving depends on the agent trusting the schematic.** In wishlist rep 3 the with-schematics agent read the whole cart feature before running `builder`, as the other arm does; that pair saved 4% of tokens. Total tokens ranged from 1.59M to 3.08M without schematics and from 633k to 1.55M with them.
- **Not measured**: the cost of keeping the schematic current when the repository's conventions change, and the cost of choosing it (the arm context names it).

The full protocol, the decision rule and both verdicts are in [`harness/EXPERIMENT.md`](./harness/EXPERIMENT.md). It is the working document of the experiment and keeps local paths from the machine it ran on.

## Layout

```
workbench-04-storefront-microfrontends/
├── with-schematics/       # storefront at the phase 3 base commit + project-builder.json + schematics/feature
├── without-schematics/    # the same storefront, no schematics
├── harness/
│   ├── docker/            # runner images (arm B adds builder, bun and @pbuilder/sdk)
│   ├── bin/               # run.sh, batch-phase3.sh, e2e_run.py, analyze.py
│   ├── tasks/             # task prompts for phases 1 and 3
│   └── EXPERIMENT.md      # protocol, decision rule, results, verdicts
└── results/               # one bench.json and agent-report.md per phase 3 run
```

In `results/`, features map to batches (reviews 1, wishlist 2, promotions 3) and each repetition is its own `sweep_id` (`wb04-rep1` to `wb04-rep3`). Schematic v1 runs are kept as `wb04-schematic-v1-rep<n>`, and the Opus rerun of both arms as `wb04-sdk012-rep<n>`. The end-to-end probe is recorded as an extra gate; `first_attempt_pass` covers the four root checks the task asks for. Gate timings were not captured. Each `agent-report.md` is the agent's final message from that run's `result` event, unedited; the dashboard shows it as a run note and never scores it.

## Run it yourself

Prerequisites: Docker, Node.js 26, an Anthropic API key, and for the with-schematics arm the Project Builder CLI (`brew install project-builder-schematics/tap/pbuilder`), [Bun](https://bun.sh) and `@pbuilder/sdk` 0.12.0 (phases 3 and 3b ran on 0.3.1).

1. In each arm: `npm ci`, then `npm run lint && npm run typecheck && npm run test`.
2. Give both arms the same prompt from `harness/tasks/phase3-<feature>.md`, with the arm's `CONTEXT.md` as system context. In with-schematics, run `builder` from the arm root.
3. For clean-room runs, build the images in `harness/docker` and use `harness/bin/run.sh`. The scripts were written for one machine: adjust the paths at the top of each before use.

The schematic's tests run from `with-schematics/` with `bun test schematics/feature`, given a tsconfig that maps `@pbuilder/sdk/commons`, `/testing` and `/typescript` to the SDK's `dist` entries.
