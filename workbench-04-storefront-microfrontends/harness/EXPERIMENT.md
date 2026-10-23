# Schematic-as-tool experiment

## Question

Is an agent that can call a Project Builder schematic faster, cheaper and closer to the pattern
than the same agent with a skill and Nx generators, on patterns that meet all five conditions
below?

1. The code being automated already exists, works and is stable. A schematic is useless for parts
   that change with each instance or are still being worked out; those stay with the agent.
2. The pattern is instantiated many times.
3. The output is mostly mechanical: wiring, registrations, mounts, file pairs.
4. One instance touches several files that must stay consistent.
5. A mistake is costly or hard to spot (a missing guard, a wrong mount).

Every real task mixes a static part (the skeleton the schematic generates) with a dynamic part
(domain logic, integration). The schematic can only speed up the static part, so the static share
of a task caps the saving, whatever the generator does.

If the answer is no, the rest of the Project Builder design (drift check, Catalog, Selection) is
not justified.

## Why this repository

The experiment runs on a new public repository so that no company code reaches the API and the
results can be shared and reproduced. The new repository takes its configuration (rsbuild, Module
Federation, Biome, Nx, the shadcn component library) from `Hyperxq/microfrontend-rspack`, where
that configuration already works; it does not extend that repository. The patterns must exist and
work in the new repository before anything is measured, so the experiment is split into phases
that first build them by hand.

## Patterns

### P1: new microfrontend (proven in the reference repository)

In `microfrontend-rspack`, five remotes (`features`, `footer`, `hero`, `pricing`,
`testimonials`) repeat the same package shape: `module-federation.config.ts`, `rsbuild.config.ts`,
`biome.json`, `index.html`, `src/main.tsx`, `tsconfig.json`, `package.json`. Adding one also
touches files outside the package, all of which must agree on the name and the port:

- `nx.json`: a project entry, the shell's `implicitDependencies` and the shell's `dev` command list;
- `packages/shell/module-federation.config.ts`: a `remotes` entry and a `remoteTypeUrls` entry;
- `packages/shell/src/App.tsx`: the lazy import;
- the remote's `rsbuild.config.ts`: a port no other remote uses.

The reference remotes already disagree on the federation name casing (`Features@`, `Hero@`
against `footer@`, `pricing@`, `testimonials@`): the kind of variance a schematic removes. The new
repository fixes one convention before phase 1.

Nx generates only part of P1. `nx g @nx/react:provider apps/<name> --bundler=rsbuild
--consumer=shell` creates the remote, but `--consumer` only makes the provider's `serve` target
depend on `shell:serve`; it does not add the provider to the shell's `PROVIDERS` list or render
it (verified in Nx 24 on `storefront`; an earlier version of this document said otherwise). Only
`@nx/react:consumer --providerNames` registers providers, and only when the consumer is created.
The phase 1 agents registered each provider, picked its port and copied the lint, PostCSS,
Vitest and typecheck setup by hand. P1 is still measured only as part of P3.

### P2: new NestJS microservice (to be built in phase 1)

A service generated with Nx's `@nx/nest` plugin, plus its registration in a gateway. Its exact
shape is decided while the first three services are written. `@nx/nest` generates the service but
not this repository's gateway registration.

### P3: full-stack feature slice (the measured pattern)

One feature of the storefront is one provider microfrontend, one NestJS microservice, the
gateway route to it, the typed client the microfrontend uses to call it, and the tests on both
sides. Nx generates each half on its own; no generic generator wires the two halves together or
follows this repository's conventions across them. That cross-stack wiring is where a schematic
can beat an agent that has Nx, and it is what phase 3 measures.

## Phases

| Phase | Work | Output |
|---|---|---|
| 0. Prepare | Create the new repository: an Nx workspace with the shell, the component library and the configuration taken from `microfrontend-rspack`, NestJS through `@nx/nest`, one frozen `DESIGN.md` from awesome-design-md, and the checks listed under Metrics | A base commit both arms start from |
| 1. Patterns by hand | Headless agent runs, isolated as in phase 3, build the three phase 1 features as full-stack slices (P3) with no skill and no schematic; a human reviews each one before it is merged | P3 exists and works in the new repository; time and cost per instance recorded under phase 3 conditions |
| 2. Schematics | Write a `feature` schematic for P3, reusing Nx generators where they fit | Authoring time recorded as adoption evidence |
| 3. A/B | The three phase 3 features, run in both arms | The measurement |

Phase 1 and phase 2 times are part of the result: they are what a team pays before a schematic
saves anything.

## Arms

| Arm | The agent gets | The agent does not get |
|---|---|---|
| **A: skill + Nx** | A skill describing P3, the phase 1 features as references, and Nx generators (`@nx/react`, `@nx/nest`) | `builder` and the schematics |
| **B: schematic** | Everything arm A gets, plus the schematic names and the `info` → `execute` step | Nothing else |

Arm A keeps the Nx generators because they are what an architect has today. Nx generates the
generic shape; a Project Builder schematic must win by generating this repository's shape: the
registrations in `nx.json` and the shell, the port, the naming.

## Isolation

| Risk | Control |
|---|---|
| The agent reads the phase 3 answer from history | Each run starts from a snapshot of the base commit with no history (`git archive` into a new directory, then `git init`) |
| User instructions or memory leak into the run | `claude -p --bare`: no CLAUDE.md discovery, no auto-memory, no hooks, MCP servers only through `--mcp-config`; arm context passed with `--append-system-prompt-file` |
| `~/Documents/CLAUDE.md` tells agents to use schematics | Snapshots live under `~/pb-experiment/`, outside `~/Documents` |
| Arm A finds `builder` on its own | `--disallowedTools "Bash(builder:*)"` in arm A; `BUILDER_MANIFEST` and `BUILDER_SDK_ROOT` set only in arm B |
| The agent reads files outside its snapshot | Runs use `--output-format stream-json`; a run whose tool calls read outside the snapshot is discarded |

Every run happens in a fresh Docker container (`docker/Dockerfile`, `bin/run.sh`) that holds only
the snapshot, with its own `npm ci` done before the clock starts. The container is the isolation
boundary, so the agent runs with `--dangerously-skip-permissions` and the host filesystem is not
mounted. The Claude Code sandbox was tried first and rejected: it protects `.vscode` with no
exemption, and `@nx/nest:application` always writes `.vscode/launch.json`. The image pins Claude
Code, so anyone can rebuild it and reproduce a run.

Every run uses the same pinned `--model` (`claude-sonnet-5-5`). `--bare` reads only `ANTHROPIC_API_KEY`; the runner
reads it from the macOS Keychain (`security find-generic-password -s anthropic-api-key -w`) for
each command and never exports it.

## Metrics

| Metric | Source | Note |
|---|---|---|
| Tokens and cost | `usage` and `total_cost_usd` in the result | Include cache reads |
| Wall time | `duration_ms` in the result | |
| Turns | `num_turns` in the result | Proxy for back-and-forth |
| Checks passing | Biome check, typecheck, Nx module-boundary lint, tests, and a shell build that loads every remote | Added in phase 0; the reference repository has no tests |
| Static share | Arm B only: generated lines kept in the final diff divided by all lines in the final diff | Caps the possible saving; read every other metric against it |
| Pattern deviations | Structural diff against the phase 1 instances: package files, registrations, port, naming | Bodies excluded |
| Review rounds | One human review per run, same reviewer, arm hidden | Change requests until acceptable |

Each phase 3 task runs at least 3 times per arm. One run says nothing, because LLM variance is
what is being measured.

## Decision rule

Arm B is worth it if, across the phase 3 tasks, it shows all of these:

- median tokens or wall time at least 30% lower than arm A;
- no more pattern deviations than arm A;
- no more review rounds than arm A.

Read the saving against the static share, and against the phase 2 authoring time: a schematic that
saves ten minutes per instance and took two days to write needs many instances to pay back.

If arm B does not win, the result is a discard verdict for the schematic-as-tool product.

## Known biases

- The phase 1 instances, the skill and the schematics come from the same people, so both arms
  share their blind spots.
- The reviewer may recognise the generated shape. Strip generator headers before review.
- Arm B's prompt names the schematic, which skips selection. Selection is out of scope.

## Setup decisions

| Decision | Choice | Reason |
|---|---|---|
| Repository name | `storefront` | Neutral: a name that mentions Project Builder could hint arm A towards schematics |
| Domain | A small storefront. Phase 1 features: catalog, cart, orders. Phase 3 features: reviews, wishlist, promotions | Each feature naturally needs one microfrontend and one microservice |
| Workspace | Nx alone, no Lerna | Lerna adds nothing Nx lacks in a new workspace, and Nx generators are part of arm A |
| Microfrontends | `@nx/react:consumer` and `@nx/react:provider` with `--bundler=rsbuild` | Keeps rsbuild from the reference repository and uses the generators arm A has |
| Package manager | npm | The least friction for agents in both arms |
| Design | `design-md/shopify/DESIGN.md` from awesome-design-md, frozen at one commit | Closest to a storefront |
| Federation naming | One convention, set in phase 0 | The reference repository mixes casings |

## Results

| Run | Task | Arm | Tokens | Cost | Time | Turns | Checks | Static share | Deviations | Review rounds |
|---|---|---|---|---|---|---|---|---|---|---|
| p1-catalog | catalog (phase 1) | none | 16k out / 440k cache read | $0.31 | 185 s | 21 | lint, typecheck, test pass | n/a | baseline | pending |
| p1-cart | cart (phase 1) | none | 17k out / 478k cache read | $0.35 | 224 s | 18 | lint, typecheck, test pass | n/a | baseline | pending |
| p1-orders | orders (phase 1) | none | 16k out / 569k cache read | $0.35 | 187 s | 19 | lint, typecheck, test pass | n/a | baseline | pending |
| p3-promotions-a-1 | promotions | A | 430,249 (13,791 out) | $0.29 | 144 s | 14 | lint, typecheck, test, sync pass | 52% overlap | 0 | pending |
| p3-promotions-a-2 | promotions | A | 394,183 (13,134 out) | $0.28 | 112 s | 13 | lint, typecheck, test, sync pass | 51% overlap | 0 | pending |
| p3-promotions-a-3 | promotions | A | 313,840 (13,144 out) | $0.26 | 115 s | 14 | lint, typecheck, test, sync pass | 55% overlap | 0 | pending |
| p3-promotions-b-1 | promotions | B | 91,722 (7,772 out) | $0.14 | 101 s | 8 | lint, typecheck, test, sync pass | 58% overlap | 0 | pending |
| p3-promotions-b-2 | promotions | B | 95,645 (8,393 out) | $0.15 | 103 s | 8 | lint, typecheck, test, sync pass | 58% overlap | 0 | pending |
| p3-promotions-b-3 | promotions | B | 139,055 (8,790 out) | $0.16 | 114 s | 10 | lint, typecheck, test, sync pass | 57% overlap | 0 | pending |
| p3-reviews-a-1 | reviews | A | 388,112 (14,651 out) | $0.29 | 241 s | 15 | lint, typecheck, test, sync pass | 49% overlap | 0 | pending |
| p3-reviews-a-2 | reviews | A | 679,923 (15,372 out) | $0.34 | 176 s | 19 | lint, typecheck, test, sync pass | 49% overlap | 0 | pending |
| p3-reviews-a-3 | reviews | A | 509,023 (15,131 out) | $0.31 | 158 s | 15 | lint, typecheck, test, sync pass | 49% overlap | 0 | pending |
| p3-reviews-b-1 | reviews | B | 74,098 (8,270 out) | $0.14 | 174 s | 7 | lint, typecheck, test, sync pass | 57% overlap | 0 | pending |
| p3-reviews-b-2 | reviews | B | 199,862 (9,554 out) | $0.18 | 129 s | 12 | lint, typecheck, test, sync pass | 55% overlap | 0 | pending |
| p3-reviews-b-3 | reviews | B | 79,966 (8,873 out) | $0.15 | 107 s | 7 | lint, typecheck, test, sync pass | 55% overlap | 0 | pending |
| p3-wishlist-a-1 | wishlist | A | 721,322 (16,895 out) | $0.37 | 161 s | 20 | lint, typecheck, test, sync pass | 50% overlap | 0 | pending |
| p3-wishlist-a-2 | wishlist | A | 303,082 (14,155 out) | $0.27 | 140 s | 13 | lint, typecheck, test, sync pass | 51% overlap | 0 | pending |
| p3-wishlist-a-3 | wishlist | A | 261,176 (13,829 out) | $0.26 | 114 s | 11 | lint, typecheck, test, sync pass | 50% overlap | 0 | pending |
| p3-wishlist-b-1 | wishlist | B | 103,737 (9,577 out) | $0.17 | 139 s | 8 | lint, typecheck, test, sync pass | 54% overlap | 0 | pending |
| p3-wishlist-b-2 | wishlist | B | 182,738 (10,654 out) | $0.19 | 124 s | 11 | lint, typecheck, test, sync pass | 50% overlap | 0 | pending |
| p3-wishlist-b-3 | wishlist | B | 98,975 (9,222 out) | $0.16 | 106 s | 8 | lint, typecheck, test, sync pass | 53% overlap | 0 | pending |

## Phase 2 result

The `feature` schematic (`schematics/`, outside `storefront`) took 21 minutes of agent wall time to write and test (lower bound; see `odd/tasks/storefront-phase-2.md`, L7): a 189-line factory, 36 templates (598 lines), 7 factory tests. On `main` `7af792e` it generates a feature skeleton of 46 files that passes lint, typecheck, test and `nx sync:check` after `npm install`, with no domain code.

## Phase 3 result and verdict

Runs: 18 (3 features x 2 arms x 3), base `storefront` `7af792e`, `claude-sonnet-5-5`, one fresh container per run, $4.10 in total. Every run passes lint, typecheck, test and `nx sync:check`; every run serves end to end (service on TCP, `remoteEntry.js`, shell, gateway GETs 200/404, empty writes 400, no 5xx).

| Median, n = 9 per arm | Arm A | Arm B | Change |
|---|---|---|---|
| Cost | $0.29 | $0.16 | -45% |
| Total tokens | 394k | 99k | -75% (mostly cache reads) |
| Output tokens | 14.2k | 8.9k | -37% |
| Agent time | 144 s | 114 s | -21% |
| Turns | 14 | 8 | -43% |
| Structural deviations (20 checks) | 0 | 0 | equal |
| `npm ci` from a clean checkout | 5/9 pass | 9/9 pass | arm B better |
| Blind review rounds (rep 1, n = 3 per arm) | 1 (0, 1, 0) | 4 (1, 1, 2) | arm B worse |
| Blocking review findings | 1 | 9 | arm B worse |

Decision rule: tokens at least 30% lower holds; structural deviations are equal; review rounds are higher in arm B. Under the rule as written, **arm B is not worth it for this schematic**.

What the numbers rest on:

- No arm A agent used the Nx generators. All nine copied an existing feature and renamed it, which reproduced the skeleton almost as well (50% of their added lines match the schematic output, against 55% in arm B). The competitor was copying a sibling, not Nx.
- Five of arm B's nine blocking findings come from the schematic itself, not from the agent: generic README rows ("Provider microfrontend: Reviews") with no convention line, `apps/gateway/tsconfig.app.json` rewritten by `JSON.stringify`, and the unformatted `mf.ts` entry. They are fixable in the schematic, and the reviewer used them to recognise arm B in all three cases (bias: the review was not fully blind).
- Arm A's defect the review could not see: in 4 of 9 runs the agent ran `npm install --offline`, which failed, then linked the new workspaces with `ln -s`, so `package-lock.json` lacks them and CI would fail at install. The review packets excluded the lockfile, and the reviewer passed one of those runs (R6, reviews-a-1) with 0 rounds. Arm B's context tells the agent to run `npm install`; arm A's does not, so part of this difference comes from the instruction, not from the schematic.
- The saving is small in absolute terms: about $0.13, 30 s and 6 turns per feature, against at least 21 minutes to write the schematic (about 40 features to pay back in time).
- Small samples: 3 runs per cell for the metrics, 1 per cell for the review, one reviewer (an agent). Arm A total tokens ranged from 261k to 721k on the same task.

## Schematic v2 rerun and final verdict

The first verdict blamed five of arm B's nine blocking findings on the schematic itself. Schematic v2 fixes those defects and nothing else in the experiment changes, except one sentence in arm B's context (`arms/arm-b.md`): because the schematic no longer edits the README, it now tells the agent to write the README rows and conventions. v2's changes: no README edits; every edit to an existing file is a text insertion shaped like Prettier's output; the `client.ts` stub surfaces the gateway's error `message`. Arm A is unchanged and was not rerun. 9 arm B runs (`p3v2-*`), $1.53.

| Median, n = 9 per arm | Arm A | Arm B v1 | Arm B v2 | v2 against A |
|---|---|---|---|---|
| Cost | $0.29 | $0.16 | $0.16 | -45% |
| Total tokens | 394k | 99k | 112k | -72% |
| Agent time | 144 s | 114 s | 95 s | -34% |
| Turns | 14 | 8 | 9 | -36% |
| Checks and structural deviations | all pass, 0 | all pass, 0 | all pass, 0 | equal |
| End to end, including `npm ci` | 5/9 | 9/9 | 9/9 | B better |

Blind review of v2 (a new reviewer agent, six diffs reshuffled: the same arm A rep 1 runs and arm B v2 rep 1):

| Arm | Rounds per diff | Total rounds | Blocking findings |
|---|---|---|---|
| A | reviews 0, promotions 0, wishlist 1 | 1 | 2 |
| B v2 | promotions 0, reviews 0, wishlist 1 | 1 | 1 |

The new reviewer gave the arm A diffs the same rounds as the first reviewer (0, 0, 1). No arm B v2 blocker comes from the schematic: the only one is the wishlist microfrontend without an add-item form, the same domain gap the arm A wishlist run has. The reviewer could no longer tell the arms apart: the schematic's skeleton and a copied sibling are byte-identical.

**Final verdict under the decision rule: arm B with schematic v2 is worth it on this pattern.** Median tokens are 72% lower and agent time 34% lower (both above 30%), structural deviations are equal, review rounds are equal, and arm B never broke `npm ci`.

Read it against:

- The absolute saving: about $0.13, 49 s and 5 turns per feature. Writing the schematic took at least 21 minutes for v1 plus the v2 fixes, so it pays back in time after roughly 25 to 30 features of this shape.
- The competitor: arm A copied an existing feature and reached the same structure and review quality. The schematic's measured advantages are cost, time, turns and a clean `npm install`; consistency was equal in both arms.
- The first schematic lost: its own defects cost it four review rounds. A schematic passes this rule only after it is reviewed like any other code, which is the cost the decision rule reads against.
- Arm B's context tells the agent to run `npm install` and arm A's does not; part of the `npm ci` difference may come from that instruction.
- Small samples: 3 runs per cell for metrics, 1 per cell for review, agent reviewers only.
