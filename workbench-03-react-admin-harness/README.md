# Workbench 03 — React Admin, plan-time crystallization

Tests whether the value of schematics lives in the **decision of where to
apply them**, made at planning time — not in the artifact itself.

## Why this experiment

Workbench 02 answered the amortization question: forcing an arm to schematize
everything from batch 1 cost +48% with zero quality gain on the leveled sweep
(opus-5), and the cost crossover only began to appear at batch 5. The open
question it left: does a *targeted* crystallization decision — schematize only
what will foreseeably repeat, hand-write the rest — capture the benefit
without the blanket-authoring tax?

## Design

- **Task**: identical to workbench 02 — same base app, same
  `entities-benchmark.txt` (entities, tiers, batch schedule). This keeps the
  WB-02 sweeps valid as historical baselines.
- **Both arms**: the same autonomous light harness (`HARNESS.md`):
  plan → build → verify. The orchestrator (Opus 5, pinned via `BENCH_MODEL`)
  writes `plans/batch-N.md` before any code, delegates mechanical
  implementation to the `mechanic` sub-agent (Sonnet 5, pinned in
  `.claude/agents/mechanic.md` frontmatter), and closes the four gates itself.
- **The only variable**: the with-schematics arm carries
  `plan-directives/schematics.md` — during planning, patterns repeating ≥3
  times across the remaining schedule get a Project Builder schematic authored
  before implementation; below the threshold, code is hand-written. Every
  decision is recorded in the plan file (auditable separately from execution).
  The arm also carries the pbuilder toolchain (`builder init` output: skill,
  `project-builder.json`, AGENTS.md section, `@pbuilder/sdk` dependency) and
  an empty `schematics/` workspace.

## Arms are derived, never edited

`base/` is the single source of truth. `./derive-arms.sh` regenerates both
arms (base copy + `deltas/with-schematics/` overlay); the inter-arm diff IS
the experiment's documentation. Once a sweep starts, base is frozen — an
infra fix means re-derive both arms and restart the sweep from batch 1.

## Running

From `claude-runner/`:

```bash
WORKBENCH=workbench-03-react-admin-harness ARM=with-schematics \
BENCH_MODEL=claude-opus-5 docker compose run --rm runner-web bench.sh <batch>
```

Same batch-by-batch protocol as workbench 02 (`WEB_PORT=3011` to run arms in
parallel). `bench.json` records the orchestrator model and the sub-agent
model assignments (`worker_models`).

## Metrics and falsifiable predictions

Primary: cost per batch, inter-batch variance (predictability), DoD
first-attempt, cumulative-cost crossover. With sub-agents, `num_turns` counts
only orchestration turns — cost and wall time are the honest effort metrics.

Against the WB-02 opus-5 baselines, the hypothesis predicts:

1. Treatment batch 1 cheaper than WB-02 with-schematics batch 1 (targeted
   authoring beats blanket authoring).
2. Cost crossover against the control arm before batch 5.
3. Lower inter-batch cost variance than the control arm.
