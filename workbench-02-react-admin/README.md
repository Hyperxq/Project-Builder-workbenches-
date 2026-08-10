# Workbench 02 — React Admin (Schematic Amortization)

Workbench 01 proved that RUNNING a pre-built schematic beats hand-writing the
same backend modules. It left one question open — the one every skeptic asks:
**"sure, but someone already paid the cost of building that generator."**

This workbench measures exactly that. Nobody hands the AI a schematic here:
one arm must AUTHOR its own Project Builder schematic as part of the work,
and we watch the investment amortize batch by batch.

## Design

Two arms, byte-identical at the start (copied from `base/`), except:

| Arm | Difference |
|---|---|
| `with-schematics/` | `builder init` was run — Project Builder workspace wired, ZERO templates. Its prompt instructs: build a schematic first, then use it for every entity. |
| `without-schematics/` | Untouched copy. Its prompt instructs: implement each entity by hand following the reference module. |

Both arms contain the same app: React 19 + Vite + TypeScript strict,
Tailwind v4 + shadcn/ui, TanStack Router/Query, Zustand, RHF + Zod v4, MSW v2
(mock architecture from [mock-mode-workshop](https://github.com/Hyperxq/mock-mode-workshop)),
Linear design language (`DESIGN.md`), clean architecture per feature
(`AGENTS.md`), and one finished reference module (Authors) with unit, section,
mock-infra and e2e+axe tests — all four gates green at the starting commit.

The task (`entities-benchmark.txt`) is 14 entities in three tiers: 4 vanilla
CRUDs, 7 with real-world quirks (relations via async combobox, conditional
and cross-field validation, embedded objects, inline/bulk row actions,
URL-driven filters), and 3 heavy ones (publish workflow with guards, 3-step
create wizard, role-based read-only). The quirks are the point: they test
whether generated code stays EXTENSIBLE — the 80% skeleton comes from the
generator or from typing, the 20% judgment is always on the AI.

## Protocol

1. Run in 5 batches (schedule at the bottom of `entities-benchmark.txt`),
   **one fresh clean-room session per batch per arm** (`claude-runner/`).
   No memory between batches — amortization must come from the repo, not
   from the context window.
2. Same prompt in both arms except the strategy sentence (schematic vs
   by-hand) — `claude-runner/bench.sh` composes it. Definition of done per
   entity: all four gates green.
3. Everything a run generates (entity modules, authored schematics,
   `results/`) is **gitignored** — the repo only tracks the starting state.
   Between batches: touch nothing. Before a NEW experiment, reset both arms
   from the repo root:

   ```bash
   git checkout -- workbench-02-react-admin/<arm> && git clean -fdx workbench-02-react-admin/<arm>
   ```

Measured runs, from `claude-runner/` (see its README for setup):

```bash
for N in 1 2 3 4 5; do
  ARM=with-schematics    docker compose -p bench-with    run --rm runner-web bench.sh $N
  ARM=without-schematics docker compose -p bench-without run --rm runner-web bench.sh $N
done
```

Each run drops `bench.json` (wall time, tokens, cost, gates) plus the full
agent stream under `results/<stamp>_<arm>_batchN/`.

## Metrics

- **Cumulative cost per batch** (the star chart): arm A pays schematic
  authoring in batch 1; where do the curves cross?
- **Marginal cost per batch**: the thesis says arm A's tends toward the cost
  of the custom 20% only.
- **Structural drift**: diff the module built in batch 5 against the module
  built in batch 1, per arm (naming, file shape, test structure).
- **Final quality audit**: two blind judges, same rubric as workbench 01
  adapted to frontend (component architecture, forms, error/loading states,
  a11y, test quality, spec compliance).

## Ports

`with-schematics` runs on **3010**, `without-schematics` on **3011** (both
`strictPort`) — the arms can run in parallel without colliding.
