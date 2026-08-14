import { useMemo, useState } from 'react'
import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import type { Arm, Run, WorkbenchMeta } from '../lib/results'
import {
  agentNote,
  batchSeries,
  breakEvenBatch,
  evaluateRunSet,
  groupBySweep,
  latestRuns,
  totalTokens,
} from '../lib/results'

const ARM_LABEL: Record<Arm, string> = {
  'with-schematics': 'WITH SCHEMATICS',
  'without-schematics': 'WITHOUT SCHEMATICS',
}

const ARM_DESCRIPTION: Record<Arm, string> = {
  'with-schematics': 'Plan-time crystallization',
  'without-schematics': 'Manual implementation',
}

const usd = (value: number | null | undefined) =>
  value == null ? 'Not captured' : `$${value.toFixed(2)}`

const duration = (seconds: number | null | undefined) => {
  if (seconds == null) return 'Not captured'
  return `${Math.floor(seconds / 60)}m ${String(Math.round(seconds % 60)).padStart(2, '0')}s`
}

const formatModel = (model: string) =>
  model === 'unknown'
    ? 'Not captured'
    : model
        .split('-')
        .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
        .join(' ')

const formatSweepDate = (runs: Run[]) => {
  const date = runs.at(-1)?.bench.date
  if (!date) return 'Date not captured'
  return new Intl.DateTimeFormat('en', { month: 'short', day: 'numeric' }).format(new Date(date))
}

const truncate = (value: string | undefined, length = 260) => {
  if (!value || value.length <= length) return value
  return `${value.slice(0, length).trimEnd()}…`
}

const modelSetForArm = (runs: Run[], arm: Arm) =>
  [
    ...new Set(
      runs
        .filter((run) => run.arm === arm)
        .flatMap((run) => [
          run.model,
          ...Object.entries(run.bench.agent.worker_models ?? {}).map(
            ([role, model]) => `${role}:${model}`,
          ),
        ]),
    ),
  ].sort()

function RunSetup({ runs, sweepLabel }: { runs: Run[]; sweepLabel: string }) {
  const protocol = runs.find((run) => run.bench.run?.protocol_version)?.bench.run?.protocol_version
  const orchestrators = [...new Set(runs.map((run) => run.model))]
  const workerPairs = [
    ...new Set(runs.flatMap((run) => Object.entries(run.bench.agent.worker_models ?? {}))),
  ]
  const workerModels = [...new Set(workerPairs.map(([, model]) => model))]
  const workerRoles = [...new Set(workerPairs.map(([role]) => role))]
  const context = runs.find((run) => run.bench.run?.context)?.bench.run?.context
  const sameModelSet =
    JSON.stringify(modelSetForArm(runs, 'with-schematics')) ===
    JSON.stringify(modelSetForArm(runs, 'without-schematics'))

  return (
    <section className="run-setup" aria-labelledby="run-setup-title">
      <h2 id="run-setup-title">Run setup</h2>
      <dl className="run-setup__grid">
        <div>
          <dt>Evaluation view</dt>
          <dd>{sweepLabel}</dd>
        </div>
        <div>
          <dt>Protocol</dt>
          <dd>{protocol ?? 'Legacy scorecard'}</dd>
        </div>
        <div>
          <dt>Orchestrator model</dt>
          <dd>{orchestrators.map(formatModel).join(', ')}</dd>
        </div>
        <div>
          <dt>Worker models</dt>
          <dd>{workerModels.length ? workerModels.map(formatModel).join(', ') : 'Not captured'}</dd>
          {workerRoles.length > 0 && <span>{workerRoles.join(' · ')}</span>}
        </div>
        <div>
          <dt>Harness</dt>
          <dd>{context?.harness ?? 'Not captured'}</dd>
        </div>
      </dl>
      <div className="run-setup__provenance">
        <span>Captured from scorecards · model IDs preserved</span>
        <span>{sameModelSet ? 'Same model set in both arms' : 'Model sets differ between arms'}</span>
      </div>
      <details className="environment-details">
        <summary>View captured environment</summary>
        <dl>
          <div>
            <dt>Host operating system</dt>
            <dd>{context?.host_os ?? 'Not captured in this scorecard'}</dd>
          </div>
          <div>
            <dt>Docker</dt>
            <dd>{context?.docker ?? 'Not captured in this scorecard'}</dd>
          </div>
          <div>
            <dt>Container</dt>
            <dd>{context?.container ?? 'Not captured in this scorecard'}</dd>
          </div>
          <div>
            <dt>Harness</dt>
            <dd>{context?.harness ?? 'Not captured in this scorecard'}</dd>
          </div>
        </dl>
      </details>
    </section>
  )
}

function MetricsTable({ runs }: { runs: Run[] }) {
  const evaluation = evaluateRunSet(runs)
  const withPass = runs
    .filter((run) => run.arm === 'with-schematics')
    .every((run) => run.bench.definition_of_done.first_attempt_pass)
  const withoutPass = runs
    .filter((run) => run.arm === 'without-schematics')
    .every((run) => run.bench.definition_of_done.first_attempt_pass)
  const fasterArm =
    evaluation.wallSeconds.withSchematics < evaluation.wallSeconds.withoutSchematics
      ? 'with-schematics'
      : evaluation.wallSeconds.withSchematics > evaluation.wallSeconds.withoutSchematics
        ? 'without-schematics'
        : null

  const valueClass = (arm: Arm, metricWinner: Arm | null) =>
    metricWinner === arm ? 'metric-value metric-value--winner' : 'metric-value'

  return (
    <div className="metrics-table-wrap">
      <table className="metrics-table">
        <caption className="sr-only">Measured comparison between both workbench arms</caption>
        <thead>
          <tr>
            <th scope="col">Metric</th>
            <th scope="col" className="arm-heading arm-heading--with">
              <span>Arm A · {ARM_LABEL['with-schematics']}</span>
              <small>{ARM_DESCRIPTION['with-schematics']}</small>
            </th>
            <th scope="col" className="arm-heading arm-heading--without">
              <span>Arm B · {ARM_LABEL['without-schematics']}</span>
              <small>{ARM_DESCRIPTION['without-schematics']}</small>
            </th>
            <th scope="col">Measured result</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <th scope="row">Total cost (USD)</th>
            <td className={valueClass('with-schematics', evaluation.winner === 'tie' || evaluation.winner === 'inconclusive' ? null : evaluation.winner)}>
              {usd(evaluation.costs.withSchematics)}
            </td>
            <td className={valueClass('without-schematics', evaluation.winner === 'tie' || evaluation.winner === 'inconclusive' ? null : evaluation.winner)}>
              {usd(evaluation.costs.withoutSchematics)}
            </td>
            <td>{evaluation.winner === 'inconclusive' ? 'Inconclusive' : 'Lower cost'}</td>
          </tr>
          <tr>
            <th scope="row">Wall time</th>
            <td className={valueClass('with-schematics', fasterArm)}>
              {duration(evaluation.wallSeconds.withSchematics)}
            </td>
            <td className={valueClass('without-schematics', fasterArm)}>
              {duration(evaluation.wallSeconds.withoutSchematics)}
            </td>
            <td>{fasterArm ? 'Faster' : 'Same time'}</td>
          </tr>
          <tr>
            <th scope="row">Quality gates</th>
            <td className={withPass ? 'metric-value metric-value--pass' : 'metric-value metric-value--fail'}>
              {withPass ? 'PASS' : 'FAIL'}
            </td>
            <td className={withoutPass ? 'metric-value metric-value--pass' : 'metric-value metric-value--fail'}>
              {withoutPass ? 'PASS' : 'FAIL'}
            </td>
            <td>{withPass && withoutPass ? 'Both pass' : 'Quality differs'}</td>
          </tr>
        </tbody>
      </table>
    </div>
  )
}

function CostChart({ runs }: { runs: Run[] }) {
  const points = batchSeries(runs)
  if (points.length === 0) return null
  const breakEven = breakEvenBatch(points)

  return (
    <section className="cost-chart" aria-labelledby="cost-chart-title">
      <div className="section-heading">
        <div>
          <h2 id="cost-chart-title">Cumulative cost by batch (USD)</h2>
          <p id="cost-chart-summary">
            {breakEven === null
              ? `No break-even was observed across ${points.length} batches.`
              : `The schematics arm reached break-even at batch ${breakEven}.`}
          </p>
        </div>
        <span className={breakEven === null ? 'break-even break-even--warning' : 'break-even'}>
          {breakEven === null ? 'No break-even observed' : `Break-even at B${breakEven}`}
        </span>
      </div>
      <div className="chart-legend" aria-hidden="true">
        <span className="chart-legend__with">Solid line · WITH SCHEMATICS</span>
        <span className="chart-legend__without">Dashed line · WITHOUT SCHEMATICS</span>
      </div>
      <div className="chart-canvas" role="img" aria-labelledby="cost-chart-title cost-chart-summary">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={points} margin={{ top: 12, right: 18, bottom: 4, left: 0 }} accessibilityLayer>
            <CartesianGrid stroke="#27313a" vertical={false} strokeDasharray="2 4" />
            <XAxis
              dataKey="batch"
              tick={{ fontSize: 12, fill: '#b8c0c7' }}
              axisLine={{ stroke: '#46515a' }}
              tickLine={{ stroke: '#46515a' }}
              tickFormatter={(batch) => `B${batch}`}
            />
            <YAxis
              tick={{ fontSize: 12, fill: '#b8c0c7' }}
              axisLine={{ stroke: '#46515a' }}
              tickLine={{ stroke: '#46515a' }}
              tickFormatter={(value) => `$${value}`}
              width={48}
            />
            <Tooltip
              formatter={(value) => usd(typeof value === 'number' ? value : null)}
              labelFormatter={(batch) => `Batch ${batch}`}
              contentStyle={{
                background: '#11181d',
                border: '1px solid #34404a',
                borderRadius: 6,
                color: '#f7fafc',
              }}
            />
            <Line
              name="With schematics"
              dataKey="withCum"
              stroke="#3191ff"
              strokeWidth={2.5}
              dot={{ r: 4, fill: '#3191ff' }}
              activeDot={{ r: 6 }}
              connectNulls={false}
            />
            <Line
              name="Without schematics"
              dataKey="withoutCum"
              stroke="#b991ff"
              strokeWidth={2.5}
              strokeDasharray="8 7"
              dot={{ r: 4, fill: '#b991ff' }}
              activeDot={{ r: 6 }}
              connectNulls={false}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
      <details className="chart-data">
        <summary>View chart data</summary>
        <div className="table-scroll">
          <table>
            <thead>
              <tr>
                <th scope="col">Batch</th>
                <th scope="col">With schematics cumulative cost</th>
                <th scope="col">Without schematics cumulative cost</th>
              </tr>
            </thead>
            <tbody>
              {points.map((point) => (
                <tr key={point.batch}>
                  <th scope="row">Batch {point.batch}</th>
                  <td>{usd(point.withCum)}</td>
                  <td>{usd(point.withoutCum)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </details>
    </section>
  )
}

function RunNote({ arm, run }: { arm: Arm; run?: Run }) {
  const note = agentNote(run?.agentReport)
  return (
    <article className={`run-note run-note--${arm}`}>
      <p className="run-note__arm">{ARM_LABEL[arm]}</p>
      {note ? (
        <>
          <h3>{note.headline}</h3>
          {note.body && <p>{truncate(note.body)}</p>}
          <small>From the agent’s final run report</small>
        </>
      ) : (
        <>
          <h3>No final report was captured</h3>
          <p>The measured scorecard is still available; this explanation is not used to score it.</p>
        </>
      )}
    </article>
  )
}

function AgentNotes({ runs }: { runs: Run[] }) {
  const batches = [...new Set(runs.map((run) => run.batch).filter((batch): batch is number => batch != null))].sort(
    (a, b) => a - b,
  )
  const [batch, setBatch] = useState(batches.at(-1))
  const selectedRuns = runs.filter((run) => run.batch === batch || (batch === undefined && run.batch === undefined))
  const reports = runs.filter((run) => run.agentReport)

  return (
    <section className="agent-notes" aria-labelledby="agent-notes-title">
      <div className="section-heading">
        <div>
          <h2 id="agent-notes-title">Agent run notes</h2>
          <p>Self-reported during execution · not used to score the result</p>
        </div>
        {batches.length > 0 && (
          <label>
            <span className="sr-only">Select batch notes</span>
            <select value={batch} onChange={(event) => setBatch(Number(event.target.value))}>
              {batches.map((value) => (
                <option key={value} value={value}>
                  Batch {value}
                </option>
              ))}
            </select>
          </label>
        )}
      </div>
      <RunNote arm="with-schematics" run={selectedRuns.find((run) => run.arm === 'with-schematics')} />
      <RunNote arm="without-schematics" run={selectedRuns.find((run) => run.arm === 'without-schematics')} />
      <details className="all-reports">
        <summary>View all {reports.length} captured run reports</summary>
        <div className="all-reports__list">
          {reports.map((run) => (
            <article key={`${run.stamp}-${run.arm}-${run.batch ?? 'full'}`}>
              <h3>
                {ARM_LABEL[run.arm]} · {run.batch == null ? 'Full run' : `Batch ${run.batch}`}
              </h3>
              <pre>{run.agentReport}</pre>
            </article>
          ))}
        </div>
      </details>
    </section>
  )
}

function EvidenceTable({ runs }: { runs: Run[] }) {
  const counted = new Set(latestRuns(runs))
  return (
    <div className="table-scroll">
      <table className="evidence-table">
        <caption className="sr-only">Every recorded run in the selected execution</caption>
        <thead>
          <tr>
            <th scope="col">Arm</th>
            <th scope="col">Batch</th>
            <th scope="col">Recorded</th>
            <th scope="col">Model</th>
            <th scope="col">Wall time</th>
            <th scope="col">Tokens</th>
            <th scope="col">Cost</th>
            <th scope="col">Quality</th>
          </tr>
        </thead>
        <tbody>
          {runs.map((run) => (
            <tr key={`${run.stamp}-${run.arm}-${run.batch ?? 'full'}`}>
              <th scope="row">{ARM_LABEL[run.arm]}</th>
              <td>{run.batch ?? 'Full run'}</td>
              <td>
                {run.stamp}
                {!counted.has(run) && <small>Superseded attempt</small>}
              </td>
              <td>{formatModel(run.model)}</td>
              <td>{duration(run.bench.agent.wall_seconds)}</td>
              <td>{totalTokens(run.bench)?.toLocaleString('en-US') ?? 'Not captured'}</td>
              <td>{usd(run.bench.agent.cost_usd)}</td>
              <td>{run.bench.definition_of_done.first_attempt_pass ? 'PASS' : 'FAIL'}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

export function WorkbenchSection({
  name,
  runs,
  meta,
  onCompare,
  availableWorkbenches,
}: {
  name: string
  runs: Run[]
  meta?: WorkbenchMeta
  onCompare: (name: string) => void
  availableWorkbenches: string[]
}) {
  const sweeps = useMemo(
    () =>
      [...groupBySweep(runs)].sort(([, first], [, second]) =>
        (second.at(-1)?.stamp ?? '').localeCompare(first.at(-1)?.stamp ?? ''),
      ),
    [runs],
  )
  const [sweepId, setSweepId] = useState(sweeps[0]?.[0] ?? '')
  const activeSweep = sweeps.find(([id]) => id === sweepId) ?? sweeps[0]
  const activeRuns = latestRuns(activeSweep?.[1] ?? [])
  const evaluation = evaluateRunSet(activeRuns)
  const points = batchSeries(activeRuns)
  const difference =
    evaluation.costs.withSchematics !== null &&
    evaluation.costs.withoutSchematics !== null &&
    evaluation.costs.withoutSchematics !== 0
      ? Math.abs(
          ((evaluation.costs.withSchematics - evaluation.costs.withoutSchematics) /
            evaluation.costs.withoutSchematics) *
            100,
        )
      : null
  const subtitle =
    evaluation.winner === 'inconclusive'
      ? 'The declared quality and cost rule cannot produce a comparison for this execution.'
      : `Both arms passed. The ${evaluation.winner === 'with-schematics' ? 'schematics' : 'manual'} arm cost ${difference?.toFixed(1) ?? 'less'}% less${points.length ? ` across ${points.length} batches` : ''}.`
  const compareTarget =
    availableWorkbenches.find((workbench) => workbench.includes('workbench-02') && workbench !== name) ??
    availableWorkbenches.find((workbench) => workbench !== name)
  const sweepLabel = activeSweep
    ? `${activeSweep[0].startsWith('legacy:') ? 'Legacy sweep' : activeSweep[0]} · ${formatSweepDate(activeSweep[1])}`
    : 'No execution selected'

  if (runs.length === 0) {
    return (
      <section className="empty-workbench">
        <p className="eyebrow">{name}</p>
        <h1>{meta?.title ?? name}</h1>
        <p>No scorecards have been recorded for this workbench yet.</p>
      </section>
    )
  }

  return (
    <article className="decision-view" aria-labelledby="decision-title">
      <header className="decision-header">
        <h1 id="decision-title">{evaluation.headline}</h1>
        <p className="decision-header__summary">{subtitle}</p>
        <div className="evaluation-status" role="status">
          <strong>{evaluation.quality === 'both-pass' ? 'Evaluation complete' : 'Evaluation needs review'}</strong>
          <span aria-hidden="true">·</span>
          <span>
            {evaluation.validRuns}/{evaluation.totalRuns} valid arm-batch runs
          </span>
          <span aria-hidden="true">·</span>
          <span>Rule-based</span>
        </div>
      </header>

      {sweeps.length > 1 && (
        <label className="sweep-picker">
          <span>Workbench execution</span>
          <select value={sweepId} onChange={(event) => setSweepId(event.target.value)}>
            {sweeps.map(([id, sweepRuns], index) => (
              <option key={id} value={id}>
                Sweep {sweeps.length - index} · {formatSweepDate(sweepRuns)} · {id}
              </option>
            ))}
          </select>
        </label>
      )}

      <RunSetup runs={activeRuns} sweepLabel={sweepLabel} />
      <MetricsTable runs={activeRuns} />

      <div className="analysis-grid">
        <CostChart runs={activeRuns} />
        <AgentNotes runs={activeRuns} />
      </div>

      <footer className="decision-footer">
        <details className="evidence-details">
          <summary>Open evidence</summary>
          <EvidenceTable runs={activeSweep?.[1] ?? []} />
        </details>
        {compareTarget && (
          <button type="button" className="text-action" onClick={() => onCompare(compareTarget)}>
            Compare with {compareTarget.match(/workbench-(\d+)/)?.[1] ?? compareTarget}
          </button>
        )}
        <details className="score-rule">
          <summary>How this result is computed</summary>
          <p>
            Compare only the latest valid attempt for each arm and batch. Both arms must pass their
            quality gates; lower cumulative cost wins. Agent run notes and Leo never affect the score.
          </p>
        </details>
      </footer>
    </article>
  )
}
