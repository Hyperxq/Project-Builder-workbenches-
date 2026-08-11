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
import type { Arm, Run, WorkbenchMeta } from '../lib/results'
import { batchSeries, breakEvenBatch, groupByModel, latestRuns, totalTokens } from '../lib/results'

const ARM_COLOR: Record<Arm, string> = {
  'with-schematics': '#3291ff',
  'without-schematics': '#ededed',
}

/** Dark-surface tooltip/legend chrome — recharts defaults assume a white canvas. */
const CHART_TOOLTIP_STYLE = {
  backgroundColor: '#171717',
  border: '1px solid #262626',
  borderRadius: 8,
  color: '#ededed',
}
const CHART_LEGEND_STYLE = { fontSize: 12, color: '#a1a1a1' }

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
              <CartesianGrid stroke="#262626" vertical={false} />
              <XAxis
                dataKey="batch"
                tick={{ fontSize: 11, fill: '#a1a1a1' }}
                axisLine={{ stroke: '#262626' }}
                tickLine={{ stroke: '#262626' }}
                tickFormatter={(b) => `B${b}`}
              />
              <YAxis
                tick={{ fontSize: 11, fill: '#a1a1a1' }}
                axisLine={{ stroke: '#262626' }}
                tickLine={{ stroke: '#262626' }}
                tickFormatter={(v) => `$${v}`}
              />
              <Tooltip
                formatter={(v) => usd(typeof v === 'number' ? v : null)}
                labelFormatter={(b) => `Batch ${b}`}
                contentStyle={CHART_TOOLTIP_STYLE}
                labelStyle={{ color: '#ededed' }}
                itemStyle={{ color: '#ededed' }}
              />
              <Legend wrapperStyle={CHART_LEGEND_STYLE} />
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
              <CartesianGrid stroke="#262626" vertical={false} />
              <XAxis
                dataKey="batch"
                tick={{ fontSize: 11, fill: '#a1a1a1' }}
                axisLine={{ stroke: '#262626' }}
                tickLine={{ stroke: '#262626' }}
                tickFormatter={(b) => `B${b}`}
              />
              <YAxis
                tick={{ fontSize: 11, fill: '#a1a1a1' }}
                axisLine={{ stroke: '#262626' }}
                tickLine={{ stroke: '#262626' }}
                tickFormatter={(v) => `$${v}`}
              />
              <Tooltip
                formatter={(v) => usd(typeof v === 'number' ? v : null)}
                labelFormatter={(b) => `Batch ${b}`}
                contentStyle={CHART_TOOLTIP_STYLE}
                labelStyle={{ color: '#ededed' }}
                itemStyle={{ color: '#ededed' }}
              />
              <Legend wrapperStyle={CHART_LEGEND_STYLE} />
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
  const current = new Set(latestRuns(runs))
  const arms = (['with-schematics', 'without-schematics'] as Arm[]).filter((arm) =>
    runs.some((r) => r.arm === arm),
  )
  const armRuns = (arm: Arm) =>
    runs
      .filter((r) => r.arm === arm)
      .sort((a, b) => (a.batch ?? 0) - (b.batch ?? 0) || a.stamp.localeCompare(b.stamp))

  return (
    <div className="mt-8 overflow-x-auto rounded-lg border border-hairline">
      <table className="w-full text-left text-sm">
        <thead>
          <tr className="border-b border-hairline bg-canvas-soft text-[11px] uppercase tracking-wide text-mute">
            <th className="px-3 py-2 font-medium">Task</th>
            <th className="px-3 py-2 font-medium">Run</th>
            <th className="px-3 py-2 font-medium">Wall</th>
            <th className="px-3 py-2 font-medium">Turns</th>
            <th className="px-3 py-2 font-medium">Tokens</th>
            <th className="px-3 py-2 font-medium">Cost</th>
            <th className="px-3 py-2 font-medium">Gates</th>
          </tr>
        </thead>
        {arms.map((arm) => {
          const rows = armRuns(arm)
          const counted = rows.filter((r) => current.has(r))
          const cost = counted.reduce<number | null>(
            (acc, r) =>
              acc === null || r.bench.agent.cost_usd === null ? null : acc + r.bench.agent.cost_usd,
            0,
          )
          const wall = counted.reduce((acc, r) => acc + r.bench.agent.wall_seconds, 0)
          return (
            <tbody key={arm}>
              <tr className="border-b border-hairline bg-canvas-soft">
                <td colSpan={2} className="px-3 py-2 text-xs font-medium" style={{ color: ARM_COLOR[arm] }}>
                  {ARM_LABEL[arm]}
                </td>
                <td className="px-3 py-2 font-mono text-xs text-mute">{secs(wall)}</td>
                <td colSpan={2} />
                <td className="px-3 py-2 font-mono text-xs text-mute">{usd(cost)}</td>
                <td />
              </tr>
              {rows.map((run) => {
                const superseded = !current.has(run)
                return (
                  <tr
                    key={`${run.stamp}-${run.model}-${run.arm}-${run.batch}`}
                    className={`border-b border-hairline last:border-0 ${superseded ? 'opacity-45' : ''}`}
                  >
                    <td className="px-3 py-2 font-mono text-xs text-body">{run.bench.task}</td>
                    <td className="px-3 py-2 font-mono text-xs text-body">
                      {run.stamp}
                      {superseded && <span className="ml-2 text-mute">superseded</span>}
                    </td>
                    <td className="px-3 py-2 font-mono text-xs">{secs(run.bench.agent.wall_seconds)}</td>
                    <td className="px-3 py-2 font-mono text-xs">{num(run.bench.agent.num_turns)}</td>
                    <td className="px-3 py-2 font-mono text-xs">{kTokens(totalTokens(run.bench))}</td>
                    <td className="px-3 py-2 font-mono text-xs">{usd(run.bench.agent.cost_usd)}</td>
                    <td className="px-3 py-2">
                      <GateChips run={run} />
                    </td>
                  </tr>
                )
              })}
            </tbody>
          )
        })}
      </table>
    </div>
  )
}

function ModelBlock({ model, runs }: { model: string; runs: Run[] }) {
  const latest = latestRuns(runs)
  const hasBatches = runs.some((r) => r.batch !== undefined)

  return (
    <div className="mt-8 first:mt-6">
      <h3 className="font-mono text-xs text-mute">model · {model}</h3>

      <div className="mt-3 grid gap-4 sm:grid-cols-2">
        <ArmCard arm="with-schematics" runs={latest.filter((r) => r.arm === 'with-schematics')} />
        <ArmCard arm="without-schematics" runs={latest.filter((r) => r.arm === 'without-schematics')} />
      </div>

      {hasBatches && <BatchCharts runs={runs} />}
      <RunsTable runs={runs} />
    </div>
  )
}

export function WorkbenchSection({
  name,
  runs,
  meta,
}: {
  name: string
  runs: Run[]
  meta?: WorkbenchMeta
}) {
  const hasBatches = runs.some((r) => r.batch !== undefined)
  const byModel = [...groupByModel(runs)].sort(([a], [b]) => a.localeCompare(b))

  return (
    <section className="border-t border-hairline py-10 first:border-t-0">
      <h2 className="text-lg font-semibold tracking-tight">{meta?.title ?? name}</h2>
      <p className="mt-1 text-sm text-mute">
        <span className="font-mono text-xs">{name}</span> ·{' '}
        {runs.length === 0
          ? 'no recorded runs yet'
          : `${hasBatches ? 'batched run — amortization experiment' : 'single full-sweep run'} · ${runs.length} recorded run${runs.length === 1 ? '' : 's'}`}
      </p>

      {meta && (
        <div className="mt-4 rounded-lg border border-hairline bg-canvas-soft p-4 text-sm leading-relaxed">
          <p className="text-body">{meta.about}</p>
          <p className="mt-3">
            <span className="font-medium">What it tries to prove — </span>
            <span className="text-body">{meta.proves}</span>
          </p>
          {meta.stack && <p className="mt-3 font-mono text-xs text-mute">{meta.stack}</p>}
        </div>
      )}

      {byModel.map(([model, modelRuns]) => (
        <ModelBlock key={model} model={model} runs={modelRuns} />
      ))}
    </section>
  )
}
