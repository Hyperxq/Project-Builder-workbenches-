# Entities Benchmark — Result of the **with-schematics** arm

> Honest post-mortem of the agent that generated everything through the
> Project Builder schematics (not the hand-written arm): where the time
> went and why.

- **Date:** 2026-07-31 22:47
- **Agent wall-clock:** ~32 min (vs ~19 min for the without-schematics arm)
- **Outcome:** all 14 entities generated, all four gates green
  (`tsc --noEmit`, `lint`, `test` 16 suites / 76 tests, `test:e2e` 16 suites / 76 tests)

## Verdict up front

The with-schematics arm **lost on wall-clock by ~13 minutes**. Almost none of
that gap was caused by the schematic workflow itself. It was caused by
(1) one opaque engine error that turned a trivial problem into an
investigation, and (2) infrastructure friction that serializes what could be
parallel. The generation itself — schema skeleton, fill 10 lines, generate a
16-file slice — is fast (**~40 s/entity marginal**).

## Time losses, ranked

### 1. Biggest loss — opaque `engine_native_system_fault` (~6–8 min)

The first `default:resource` run failed with:

```
engine_native_system_fault, exit 5, empty detail
```

`--verbose` and `--output=pretty` added nothing. The suggestion ("re-run and
report if it persists") sent me down a retry path. Diagnosis required: 2
retries, running the factory test suite (30 tests, all green — so the factory
logic was fine), reading `builder execute --help` hunting for diagnostic
flags, and finally reasoning by elimination: `default:schema` (create-only)
worked, `default:resource` (reads + mutates `app.module.ts`) died.

**Root cause:** `src/app.module.ts` had CRLF line endings (leftover
working-tree state, content identical to HEAD). The factory's
`registerInAppModule()` regexes are LF-only (`\],\n`), so the factory throws
a clean, descriptive `Error` — but the engine swallows it and reports a
generic native fault with no message.

**Fix:** `sd -s $'\r' '' src/app.module.ts` — one line, instant.

**The honest part:** if the engine had propagated the factory's own error
message ("Could not locate the imports array closing in src/app.module.ts"),
this would have been a 30-second fix. The time was not lost to a hard
problem; it was lost to **error opacity**. Note the without-schematics agent
had the same CRLF file and never noticed — it rewrites `app.module.ts`
itself, so the landmine only exists on the schematic path.

### 2. Forced serialization — 28 sequential CLI calls (~4–6 min overhead)

Known constraint: `builder execute` dies with `engine_native_system_fault`
inside compound shell commands (for-loops, pipes), and resource runs race
each other on the shared `src/app.module.ts` edit. So: 14 schema runs + 14
resource runs, one per Bash invocation, strictly sequential, each paying full
round-trip + permission-classifier overhead. The without-schematics agent
writes 16 files per entity **in parallel in a single turn**; its write path
has no such bottleneck. This is pure infrastructure tax, not workflow cost.

### 3. Harness friction, not Project Builder's fault (~2–3 min)

- Permission classifier outage mid-run: one schema generation (`vehicles`)
  had to be postponed and retried.
- GateGuard blocked first writes to paths matching `billing` and `payment`
  (synthetic benchmark schemas, no real payment logic); unblocking requires
  verifying importers and restating facts.

These would have hit *any* agent, but the schematic arm's many small
sequential operations expose more surface to them.

## What wall-clock does not measure

| Dimension | With schematics | Hand-written |
|---|---|---|
| Files written by the agent | 17 small schemas (~10 lines each) | ~220 files, token by token |
| Inter-slice consistency | Zero drift, by construction | Depends on copying the reference correctly 14× |
| Review surface | 17 files | ~220 files |
| Marginal cost of entity #15 | ~40 s | Another full hand-written slice |
| Convention change | One template edit + regenerate | 15 manual rewrites |

## Actionable fixes (would flip the benchmark)

1. **Engine:** propagate factory throw messages instead of collapsing them
   into `engine_native_system_fault`. Highest value per line changed.
2. **Engine:** fix execution inside compound commands / allow batched or
   parallel executes (would collapse 28 round-trips into a few).
3. **Schematic hardening:** make `registerInAppModule()` line-ending
   tolerant (`\r?\n` in the regexes), or normalize on read.

With #1 and #2 alone, this run would plausibly have come in under the
19-minute hand-written baseline.
