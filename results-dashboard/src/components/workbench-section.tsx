import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import type { Arm, Run } from '../lib/results'
import { batchSeries, breakEvenBatch, latestRuns, totalTokens } from '../lib/results'

const ARM_COLOR: Record<Arm, string> = {
  'with-schematics': '#0070f3',
  'without-schematics': '#171717',
}

const ARM_LABEL: Record<Arm, string> = {
  'with-schematics': 'With schematics',
  'without-schematics': 'Without schematics',
}

const usd = (v: number | null | undefined) => (v == null ? '—' : `$${v.toFixed(2)}`)
const secs = (v: number | null | undefined) =>
  v == null ? '—' : `${Math.floor(v / 60)}m ${String(Math.round(v % 60)).padStart(2, '0')}s`
const num = (v: number | null | undefined) => (v == null ? '—' : v.toLocaleString('en-US'))
const kTokens = (v: number | null) => (v == null ? '—' : `${(v / 1000).toFixed(1)}k`)

function DodBadge({ pass }: { pass: boolean }) {
  return (
    <span
      className={`rounded-full px-2 py-0.5 font-mono text-[11px] ${
        pass ? 'bg-success-soft text-link' : 'bg-error-soft text-error'
      }`}
    >
      {pass ? 'DoD PASS' : 'DoD FAIL'}
    </span>
  )
}

function GateChips({ run }: { run: Run }) {
  return (
    <span className="flex flex-wrap gap-1">
      {run.bench.definition_of_done.gates.map((g) => (
        <span
          key={g.gate}
          title={`${g.gate}: ${g.pass ? 'pass' : 'FAIL'} (${g.seconds}s)`}
          className={`rounded px-1.5 py-0.5 font-mono text-[10px] ${
            g.pass ? 'bg-canvas-soft-2 text-body' : 'bg-error-soft text-error'
          }`}
        >
          {g.gate}
        </span>
      ))}
    </span>
  )
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-[11px] uppercase tracking-wide text-mute">{label}</dt>
      <dd className="mt-0.5 font-mono text-sm">{value}</dd>
    </div>
  )
}

function ArmCard({ arm, runs }: { arm: Arm; runs: Run[] }) {
  if (runs.length === 0) {
    return (
      <div className="rounded-lg border border-hairline bg-canvas-soft p-5">
        <h4 className="text-sm font-medium" style={{ color: ARM_COLOR[arm] }}>
          {ARM_LABEL[arm]}
        </h4>
        <p className="mt-3 text-sm text-mute">No runs yet.</p>
      </div>
    )
  }

  const cost = runs.reduce<number | null>(
    (acc, r) => (acc === null || r.bench.agent.cost_usd === null ? null : acc + r.bench.agent.cost_usd),
    0,
  )
  const wall = runs.reduce((acc, r) => acc + r.bench.agent.wall_seconds, 0)
  const turns = runs.reduce((acc, r) => acc + (r.bench.agent.num_turns ?? 0), 0)
  const tokens = runs.reduce<number | null>((acc, r) => {
    const t = totalTokens(r.bench)
    return acc === null || t === null ? null : acc + t
  }, 0)
  const files = runs.reduce((acc, r) => acc + r.bench.output.files_created, 0)
  const loc = runs.reduce((acc, r) => acc + r.bench.output.loc_delta, 0)
  const allPass = runs.every((r) => r.bench.definition_of_done.first_attempt_pass)

  return (
    <div className="rounded-lg border border-hairline p-5">
      <div className="flex items-center justify-between">
        <h4 className="text-sm font-medium" style={{ color: ARM_COLOR[arm] }}>
          {ARM_LABEL[arm]}
        </h4>
        <DodBadge pass={allPass} />
      </div>
      <dl className="mt-4 grid grid-cols-3 gap-x-4 gap-y-3">
        <Stat label="Cost" value={usd(cost)} />
        <Stat label="Wall time" value={secs(wall)} />
        <Stat label="Turns" value={num(turns)} />
        <Stat label="Tokens in+out" value={kTokens(tokens)} />
        <Stat label="Files" value={num(files)} />
        <Stat label="LOC" value={num(loc)} />
      </dl>
      {runs.length > 1 && (
        <p className="mt-3 text-[11px] text-mute">Totals across {runs.length} batches (latest run each).</p>
      )}
    </div>
  )
}

function BatchCharts({ runs }: { runs: Run[] }) {
  const points = batchSeries(runs)
  if (points.length === 0) return null
  const breakEven = breakEvenBatch(points)

  return (
    <div className="mt-8">
      <div className="flex items-baseline justify-between">
        <h4 className="text-sm font-medium">Amortization — cost per batch (USD)</h4>
        <p className="font-mono text-xs text-mute">
          {breakEven !== null
            ? `break-even at batch ${breakEven}`
            : 'break-even not reached yet'}
        </p>
      </div>
      <div className="mt-4 grid gap-8 lg:grid-cols-2">
        <div>
          <p className="mb-2 text-[11px] uppercase tracking-wide text-mute">Cumulative</p>
          <ResponsiveContainer width="100%" height={260}>
            <LineChart data={points} margin={{ top: 4, right: 8, bottom: 0, left: -16 }}>
              <CartesianGrid stroke="#ebebeb" vertical={false} />
              <XAxis dataKey="batch" tick={{ fontSize: 11 }} tickFormatter={(b) => `B${b}`} />
              <YAxis tick={{ fontSize: 11 }} tickFormatter={(v) => `$${v}`} />
              <Tooltip formatter={(v) => usd(typeof v === 'number' ? v : null)} labelFormatter={(b) => `Batch ${b}`} />
              <Legend wrapperStyle={{ fontSize: 12 }} />
              {breakEven !== null && <ReferenceLine x={breakEven} stroke="#f5a623" strokeDasharray="4 4" />}
              <Line
                name="with schematics"
                dataKey="withCum"
                stroke={ARM_COLOR['with-schematics']}
                strokeWidth={2}
                dot={{ r: 3 }}
              />
              <Line
                name="without schematics"
                dataKey="withoutCum"
                stroke={ARM_COLOR['without-schematics']}
                strokeWidth={2}
                dot={{ r: 3 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
        <div>
          <p className="mb-2 text-[11px] uppercase tracking-wide text-mute">Marginal (per batch)</p>
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={points} margin={{ top: 4, right: 8, bottom: 0, left: -16 }}>
              <CartesianGrid stroke="#ebebeb" vertical={false} />
              <XAxis dataKey="batch" tick={{ fontSize: 11 }} tickFormatter={(b) => `B${b}`} />
              <YAxis tick={{ fontSize: 11 }} tickFormatter={(v) => `$${v}`} />
              <Tooltip formatter={(v) => usd(typeof v === 'number' ? v : null)} labelFormatter={(b) => `Batch ${b}`} />
              <Legend wrapperStyle={{ fontSize: 12 }} />
              <Bar name="with schematics" dataKey="withCost" fill={ARM_COLOR['with-schematics']} />
              <Bar name="without schematics" dataKey="withoutCost" fill={ARM_COLOR['without-schematics']} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  )
}

function RunsTable({ runs }: { runs: Run[] }) {
  const ordered = [...runs].sort(
    (a, b) => b.stamp.localeCompare(a.stamp) || a.arm.localeCompare(b.arm),
  )
  return (
    <div className="mt-8 overflow-x-auto rounded-lg border border-hairline">
      <table className="w-full text-left text-sm">
        <thead>
          <tr className="border-b border-hairline bg-canvas-soft text-[11px] uppercase tracking-wide text-mute">
            <th className="px-3 py-2 font-medium">Run</th>
            <th className="px-3 py-2 font-medium">Arm</th>
            <th className="px-3 py-2 font-medium">Task</th>
            <th className="px-3 py-2 font-medium">Wall</th>
            <th className="px-3 py-2 font-medium">Turns</th>
            <th className="px-3 py-2 font-medium">Tokens</th>
            <th className="px-3 py-2 font-medium">Cost</th>
            <th className="px-3 py-2 font-medium">Gates</th>
          </tr>
        </thead>
        <tbody>
          {ordered.map((run) => (
            <tr key={`${run.stamp}-${run.arm}-${run.batch}`} className="border-b border-hairline last:border-0">
              <td className="px-3 py-2 font-mono text-xs text-body">{run.stamp}</td>
              <td className="px-3 py-2">
                <span style={{ color: ARM_COLOR[run.arm] }}>{ARM_LABEL[run.arm]}</span>
              </td>
              <td className="px-3 py-2 font-mono text-xs text-body">{run.bench.task}</td>
              <td className="px-3 py-2 font-mono text-xs">{secs(run.bench.agent.wall_seconds)}</td>
              <td className="px-3 py-2 font-mono text-xs">{num(run.bench.agent.num_turns)}</td>
              <td className="px-3 py-2 font-mono text-xs">{kTokens(totalTokens(run.bench))}</td>
              <td className="px-3 py-2 font-mono text-xs">{usd(run.bench.agent.cost_usd)}</td>
              <td className="px-3 py-2">
                <GateChips run={run} />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

export function WorkbenchSection({ name, runs }: { name: string; runs: Run[] }) {
  const latest = latestRuns(runs)
  const hasBatches = runs.some((r) => r.batch !== undefined)

  return (
    <section className="border-t border-hairline py-10 first:border-t-0">
      <h2 className="text-lg font-semibold tracking-tight">{name}</h2>
      <p className="mt-1 text-sm text-mute">
        {hasBatches ? 'Batched run — amortization experiment' : 'Single full-sweep run'} ·{' '}
        {runs.length} recorded run{runs.length === 1 ? '' : 's'}
      </p>

      <div className="mt-6 grid gap-4 sm:grid-cols-2">
        <ArmCard arm="with-schematics" runs={latest.filter((r) => r.arm === 'with-schematics')} />
        <ArmCard arm="without-schematics" runs={latest.filter((r) => r.arm === 'without-schematics')} />
      </div>

      {hasBatches && <BatchCharts runs={runs} />}
      <RunsTable runs={runs} />
    </section>
  )
}
