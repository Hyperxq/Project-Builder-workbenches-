/**
 * Loading + analysis of workbench bench.json scorecards.
 *
 * A "run" is one measured bench.sh execution. Its identity comes from the
 * results directory name: `<stamp>_<arm>[_batchN]`. When the same arm+batch
 * was run more than once, the LATEST run is the one the comparisons use —
 * every run still appears in the runs table.
 */

export interface GateResult {
  gate: string
  pass: boolean
  seconds: number
}

export interface Bench {
  date: string
  arm: string
  task: string
  agent: {
    exit_code: number
    wall_seconds: number
    api_seconds: number | null
    num_turns: number | null
    tokens: {
      input_tokens?: number
      output_tokens?: number
      cache_read_input_tokens?: number
      cache_creation_input_tokens?: number
    } | null
    cost_usd: number | null
    session_id: string | null
  }
  definition_of_done: {
    first_attempt_pass: boolean
    gates: GateResult[]
  }
  output: {
    files_created: number
    loc_delta: number
  }
}

export type Arm = 'with-schematics' | 'without-schematics'

export interface Run {
  workbench: string
  stamp: string
  arm: Arm
  /** undefined for single-sweep workbenches (wb-01) */
  batch?: number
  bench: Bench
}

const RUN_DIR = /^(\d{4}-\d{2}-\d{2}_\d{2}-\d{2})_(with-schematics|without-schematics)(?:_batch(\d+))?$/

/** Parse one glob path + module into a Run. Returns null for non-run files. */
export function parseRun(path: string, bench: Bench): Run | null {
  // ../../<workbench>/results/<run-dir>/bench.json
  const parts = path.split('/')
  const runDir = parts[parts.length - 2]
  const workbench = parts[parts.length - 4]
  const match = runDir?.match(RUN_DIR)
  if (!match || !workbench) return null
  return {
    workbench,
    stamp: match[1],
    arm: match[2] as Arm,
    batch: match[3] ? Number(match[3]) : undefined,
    bench,
  }
}

export function loadRuns(): Run[] {
  const modules = import.meta.glob<{ default: Bench }>(
    '../../../workbench-*/results/*/bench.json',
    { eager: true },
  )
  return Object.entries(modules)
    .map(([path, mod]) => parseRun(path, mod.default))
    .filter((run): run is Run => run !== null)
    .sort((a, b) => a.stamp.localeCompare(b.stamp))
}

/** Total tokens the agent consumed (input + output, cache reads excluded). */
export function totalTokens(bench: Bench): number | null {
  const t = bench.agent.tokens
  if (!t) return null
  return (t.input_tokens ?? 0) + (t.output_tokens ?? 0)
}

/** Latest run per (arm, batch) — reruns supersede older attempts. */
export function latestRuns(runs: Run[]): Run[] {
  const byKey = new Map<string, Run>()
  for (const run of runs) {
    const key = `${run.arm}#${run.batch ?? ''}`
    const existing = byKey.get(key)
    if (!existing || run.stamp > existing.stamp) byKey.set(key, run)
  }
  return [...byKey.values()]
}

export function groupByWorkbench(runs: Run[]): Map<string, Run[]> {
  const groups = new Map<string, Run[]>()
  for (const run of runs) {
    const list = groups.get(run.workbench) ?? []
    list.push(run)
    groups.set(run.workbench, list)
  }
  return groups
}

export interface BatchPoint {
  batch: number
  withCost: number | null
  withoutCost: number | null
  withCum: number | null
  withoutCum: number | null
}

/**
 * Per-batch marginal and cumulative cost series for a batched workbench.
 * Cumulative values stay null until that arm has data for EVERY batch up
 * to that point — a curve with holes would lie about totals.
 */
export function batchSeries(runs: Run[]): BatchPoint[] {
  const latest = latestRuns(runs).filter((r) => r.batch !== undefined)
  if (latest.length === 0) return []
  const maxBatch = Math.max(...latest.map((r) => r.batch!))

  const cost = (arm: Arm, batch: number): number | null =>
    latest.find((r) => r.arm === arm && r.batch === batch)?.bench.agent.cost_usd ?? null

  const points: BatchPoint[] = []
  let withCum: number | null = 0
  let withoutCum: number | null = 0
  for (let batch = 1; batch <= maxBatch; batch++) {
    const withCost = cost('with-schematics', batch)
    const withoutCost = cost('without-schematics', batch)
    withCum = withCum !== null && withCost !== null ? withCum + withCost : null
    withoutCum = withoutCum !== null && withoutCost !== null ? withoutCum + withoutCost : null
    points.push({ batch, withCost, withoutCost, withCum, withoutCum })
  }
  return points
}

/** First batch where the schematic arm's cumulative cost drops to or below the manual arm's. */
export function breakEvenBatch(points: BatchPoint[]): number | null {
  for (const p of points) {
    if (p.withCum !== null && p.withoutCum !== null && p.withCum <= p.withoutCum) return p.batch
  }
  return null
}
