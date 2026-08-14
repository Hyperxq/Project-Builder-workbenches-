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
    model?: string
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
    worker_models?: Record<string, string>
  }
  run?: {
    sweep_id?: string
    protocol_version?: string
    attempt?: number
    context?: {
      host_os?: string
      docker?: string
      container?: string
      harness?: string
    }
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
  /** from bench.agent.model; 'unknown' for scorecards recorded before model tracking */
  model: string
  /** Verbatim self-report captured from the terminal result event. Never used for scoring. */
  agentReport?: string
  bench: Bench
}

const RUN_DIR = /^(\d{4}-\d{2}-\d{2}_\d{2}-\d{2})_(with-schematics|without-schematics)(?:_batch(\d+))?$/

/** Parse one glob path + module into a Run. Returns null for non-run files. */
export function parseRun(path: string, bench: Bench, agentReport?: string): Run | null {
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
    model: bench.agent.model ?? 'unknown',
    agentReport,
    bench,
  }
}

export interface WorkbenchMeta {
  title: string
  stack?: string
  about: string
  proves: string
}

/** Optional per-workbench description, declared in `<workbench>/workbench.json`. */
export function loadWorkbenchMeta(): Map<string, WorkbenchMeta> {
  const modules = import.meta.glob<{ default: WorkbenchMeta }>(
    '../../../workbench-*/workbench.json',
    { eager: true },
  )
  const meta = new Map<string, WorkbenchMeta>()
  for (const [path, mod] of Object.entries(modules)) {
    const workbench = path.split('/').at(-2)
    if (workbench) meta.set(workbench, mod.default)
  }
  return meta
}

export function loadRuns(): Run[] {
  const modules = import.meta.glob<{ default: Bench }>(
    '../../../workbench-*/results/*/bench.json',
    { eager: true },
  )
  const streams = import.meta.glob<string>(
    '../../../workbench-*/results/*/claude-stream.jsonl',
    { eager: true, query: '?raw', import: 'default' },
  )
  const reports = new Map(
    Object.entries(streams).map(([path, stream]) => [
      path.replace('/claude-stream.jsonl', '/bench.json'),
      extractFinalReport(stream),
    ]),
  )
  // Streams stay local (gitignored), so deployed builds would lose every agent
  // note. A run may commit its final self-report as agent-report.md — same
  // verbatim text, used only when the full stream is absent.
  const committedReports = import.meta.glob<string>(
    '../../../workbench-*/results/*/agent-report.md',
    { eager: true, query: '?raw', import: 'default' },
  )
  for (const [path, report] of Object.entries(committedReports)) {
    const key = path.replace('/agent-report.md', '/bench.json')
    if (!reports.get(key)) reports.set(key, report.trim())
  }
  return Object.entries(modules)
    .map(([path, mod]) => parseRun(path, mod.default, reports.get(path)))
    .filter((run): run is Run => run !== null)
    .sort((a, b) => a.stamp.localeCompare(b.stamp))
}

/** Pull the final self-report from a JSONL stream without interpreting it. */
export function extractFinalReport(stream: string): string | undefined {
  let report: string | undefined
  for (const line of stream.split('\n')) {
    if (!line.trim()) continue
    try {
      const event = JSON.parse(line) as { type?: string; result?: unknown }
      if (event.type === 'result' && typeof event.result === 'string') report = event.result
    } catch {
      // A truncated telemetry line must not hide the rest of the measured scorecards.
    }
  }
  return report
}

/** Total tokens the agent consumed (input + output, cache reads excluded). */
export function totalTokens(bench: Bench): number | null {
  const t = bench.agent.tokens
  if (!t) return null
  return (t.input_tokens ?? 0) + (t.output_tokens ?? 0)
}

/** Latest run per (model, arm, batch) — reruns supersede older attempts within the same model. */
export function latestRuns(runs: Run[]): Run[] {
  const byKey = new Map<string, Run>()
  for (const run of runs) {
    const key = `${run.model}#${run.arm}#${run.batch ?? ''}`
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

export function groupByModel(runs: Run[]): Map<string, Run[]> {
  const groups = new Map<string, Run[]>()
  for (const run of runs) {
    const list = groups.get(run.model) ?? []
    list.push(run)
    groups.set(run.model, list)
  }
  return groups
}

/**
 * Explicit sweep IDs keep independent workbench executions separate. Older
 * scorecards did not record one, so they remain a clearly labelled legacy
 * cohort and are never combined across models.
 */
export function groupBySweep(runs: Run[]): Map<string, Run[]> {
  const groups = new Map<string, Run[]>()
  for (const run of runs) {
    const key = run.bench.run?.sweep_id ?? `legacy:${run.model}`
    const list = groups.get(key) ?? []
    list.push(run)
    groups.set(key, list)
  }
  return groups
}

export type MeasuredWinner = Arm | 'tie' | 'inconclusive'

export interface RunSetEvaluation {
  winner: MeasuredWinner
  headline: string
  validRuns: number
  totalRuns: number
  quality: 'both-pass' | 'failed' | 'incomplete'
  costs: {
    withSchematics: number | null
    withoutSchematics: number | null
  }
  wallSeconds: {
    withSchematics: number
    withoutSchematics: number
  }
}

const armTotalCost = (runs: Run[]): number | null =>
  runs.reduce<number | null>(
    (total, run) =>
      total === null || run.bench.agent.cost_usd === null
        ? null
        : total + run.bench.agent.cost_usd,
    0,
  )

/** Apply the declared scorecard rule directly; agent prose never enters this result. */
export function evaluateRunSet(runs: Run[]): RunSetEvaluation {
  const counted = latestRuns(runs)
  const withRuns = counted.filter((run) => run.arm === 'with-schematics')
  const withoutRuns = counted.filter((run) => run.arm === 'without-schematics')
  const valid = counted.filter(
    (run) => run.bench.agent.exit_code === 0 && run.bench.definition_of_done.first_attempt_pass,
  )
  const bothPresent = withRuns.length > 0 && withoutRuns.length > 0
  const allPass = bothPresent && valid.length === counted.length
  const costs = {
    withSchematics: armTotalCost(withRuns),
    withoutSchematics: armTotalCost(withoutRuns),
  }

  let winner: MeasuredWinner = 'inconclusive'
  if (allPass && costs.withSchematics !== null && costs.withoutSchematics !== null) {
    if (costs.withSchematics < costs.withoutSchematics) winner = 'with-schematics'
    else if (costs.withSchematics > costs.withoutSchematics) winner = 'without-schematics'
    else winner = 'tie'
  }

  const headline =
    winner === 'with-schematics'
      ? 'With schematics costs less overall'
      : winner === 'without-schematics'
        ? 'Without schematics costs less overall'
        : winner === 'tie'
          ? 'Both approaches cost the same overall'
          : 'The measured result is inconclusive'

  return {
    winner,
    headline,
    validRuns: valid.length,
    totalRuns: counted.length,
    quality: !bothPresent ? 'incomplete' : allPass ? 'both-pass' : 'failed',
    costs,
    wallSeconds: {
      withSchematics: withRuns.reduce((total, run) => total + run.bench.agent.wall_seconds, 0),
      withoutSchematics: withoutRuns.reduce((total, run) => total + run.bench.agent.wall_seconds, 0),
    },
  }
}

export interface AgentNote {
  headline: string
  body?: string
  source: 'Agent final report'
}

/** Select one useful paragraph from the captured report; keep its wording intact. */
export function agentNote(report: string | undefined): AgentNote | undefined {
  if (!report) return undefined
  const paragraphs = report
    .split(/\n\s*\n/)
    .map((paragraph) =>
      paragraph
        .replace(/^#{1,6}\s+/g, '')
        .replace(/[*`]/g, '')
        .replace(/\s+/g, ' ')
        .trim(),
    )
    .filter((paragraph) => paragraph.length > 0 && !paragraph.startsWith('|'))
  const score = (paragraph: string) =>
    (/\b(failures?|failed|fixed|follow-up|extra|took|slow|blocked)\b/i.test(paragraph) ? 4 : 0) +
    (/\b(verify|verification)\b/i.test(paragraph) ? 1 : 0) -
    (/verification plan/i.test(paragraph) ? 2 : 0)
  const selected = [...paragraphs].sort((first, second) => score(second) - score(first))[0]
  if (!selected) return undefined

  const sentence = selected.match(/^.*?[.!?](?:\s|$)/)?.[0]?.trim() ?? selected
  const body = selected.slice(sentence.length).trim()
  return {
    headline: sentence,
    body: body || undefined,
    source: 'Agent final report',
  }
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
