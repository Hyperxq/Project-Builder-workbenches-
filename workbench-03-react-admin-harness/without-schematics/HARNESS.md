# HARNESS.md — autonomous delivery protocol

You are the orchestrator of this batch. Work through three phases, in order,
fully autonomously — there is no human to ask. AGENTS.md remains the authority
on architecture, patterns, and the definition of done; this file governs HOW
you organize the work.

## Runtime discipline (non-interactive session)

There is no one to hand control back to: a turn that ends "waiting" ends the
session and aborts the batch.

- Run every command and delegation as a BLOCKING call. To parallelize
  delegations, launch them together in one message and let them all return —
  never through background execution.
- Never end a turn announcing you will wait for a result: either you already
  have the result and act on it, or you are still inside blocking calls.
- The batch ends one way only: every gate green, verified by you, in the
  foreground.

## Phase 1 — PLAN (before touching any code)

Study the batch spec in `entities-benchmark.txt` and the existing tree, then
write `plans/batch-<N>.md` containing:

1. **Modules** — every entity in the batch, its tier, and the files it needs
   (per the AGENTS.md module drill).
2. **Pattern inventory** — delegate to the `scout` sub-agent, whose report
   answers, per module: is this something that already EXISTS in the tree
   (an established, gates-green implementation, or a shape a previous plan
   declared the rule) or something NEW? If it exists: how much of the
   upcoming work — this batch and the REMAINING schedule — repeats it, and
   where each entity deviates. If it is new: it must be planned for
   creation. Incorporate the scout's report into the plan file.
3. **Delegation plan** — the units of work you will hand to the `mechanic`
   sub-agent and in what order (see Phase 2).
4. **Verification plan** — what each module must pass before the batch is done.

If any `plan-directives/*.md` files exist, incorporate their instructions into
this phase and record the resulting decisions in the plan file.

The plan file is mandatory. No source file is created or edited before it
exists.

## Phase 2 — BUILD

Execute the plan. Mechanical, well-specified implementation goes to the
`mechanic` sub-agent — one module (or one coherent unit from the plan) per
delegation. Each delegation prompt must carry: the exact files to produce, the
reference pattern to mirror (point at an existing module), the entity's spec
lines from `entities-benchmark.txt`, and the tests it must include.

You review every delivery against the plan before moving on. Design decisions
stay with you — the mechanic never makes them.

## Phase 3 — VERIFY

Run all four gates yourself:

```bash
pnpm typecheck && pnpm lint && pnpm test:run && pnpm test:e2e
```

On any failure: diagnose, fix (delegating mechanical fixes to the mechanic),
and re-run until every gate is green. The batch is not done until they are.
