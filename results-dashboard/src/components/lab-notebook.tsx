import { useState } from 'react'
import type { Criterion, Experiment, HypothesisStatus } from '../lib/experiments'
import { cohortRuns, evaluateExperiment } from '../lib/experiments'
import type { Run } from '../lib/results'

const STATUS_LABEL: Record<HypothesisStatus, string> = {
  supported: 'Supported',
  refuted: 'Refuted',
  inconclusive: 'Inconclusive',
  pending: 'Pending',
}

const METRIC_LABEL: Record<Criterion['metric'], string> = {
  cost_usd: 'Cost',
  wall_seconds: 'Wall time',
  api_seconds: 'API time',
  tokens_all: 'Tokens incl. cache',
}

const formatMetric = (metric: Criterion['metric'], value: number | null) => {
  if (value === null) return 'Not captured'
  if (metric === 'cost_usd') return `$${value.toFixed(2)}`
  if (metric === 'tokens_all') return `${Math.round(value / 1000).toLocaleString('en-US')}k`
  return `${Math.round(value)} s`
}

const signedPct = (value: number) => `${value > 0 ? '+' : value < 0 ? '−' : ''}${Math.abs(value).toFixed(0)}%`

const percent = (value: number | null) => (value === null ? '—' : `${Math.round(value * 100)}%`)

function Conditions({ experiment, runs }: { experiment: Experiment; runs: Run[] }) {
  const cohorts = [experiment.treatment, experiment.baseline].map((cohort) => {
    const selected = cohortRuns(runs, cohort)
    return {
      cohort,
      count: selected.length,
      models: [...new Set(selected.map((run) => run.model))],
    }
  })
  return (
    <dl className="lab-conditions">
      <div>
        <dt>Variable</dt>
        <dd>{experiment.variable}</dd>
      </div>
      <div>
        <dt>Held constant</dt>
        <dd>
          <ul>
            {experiment.constants.map((constant) => (
              <li key={constant}>{constant}</li>
            ))}
          </ul>
        </dd>
      </div>
      {cohorts.map(({ cohort, count, models }, index) => (
        <div key={cohort.label}>
          <dt>{index === 0 ? 'Treatment' : 'Baseline'}</dt>
          <dd>
            {cohort.label}
            <span>
              {count}
              {cohort.expected_runs ? ` of ${cohort.expected_runs}` : ''} runs · {cohort.sweeps.join(', ')}
              {models.length > 0 && ` · ${models.join(', ')}`}
            </span>
          </dd>
        </div>
      ))}
    </dl>
  )
}

function Result({ experiment, runs }: { experiment: Experiment; runs: Run[] }) {
  const result = evaluateExperiment(experiment, runs)
  return (
    <>
      <p className={`lab-status lab-status--${result.status}`} role="status">
        <strong>{STATUS_LABEL[result.status]}</strong>
        <span>{result.reason}</span>
      </p>
      <div className="table-scroll">
        <table className="lab-criteria">
          <caption className="sr-only">Predicted change against the measured change</caption>
          <thead>
            <tr>
              <th scope="col">Criterion</th>
              <th scope="col">{experiment.treatment.label}</th>
              <th scope="col">{experiment.baseline.label}</th>
              <th scope="col">Change</th>
              <th scope="col">Predicted</th>
            </tr>
          </thead>
          <tbody>
            {result.criteria.map(({ criterion, treatment, baseline, changePct, met }) => (
              <tr key={`${criterion.metric}-${criterion.aggregate}`}>
                <th scope="row">
                  {METRIC_LABEL[criterion.metric]} <small>{criterion.aggregate === 'sum' ? 'total' : 'median per run'}</small>
                </th>
                <td>{result.status === 'pending' ? '—' : formatMetric(criterion.metric, treatment)}</td>
                <td>{result.status === 'pending' ? '—' : formatMetric(criterion.metric, baseline)}</td>
                <td className={met === null ? undefined : met ? 'lab-met' : 'lab-missed'}>
                  {changePct === null ? '—' : signedPct(changePct)}
                  {met !== null && <span className="sr-only">{met ? ', met' : ', missed'}</span>}
                </td>
                <td>{criterion.max_change_pct === 0 ? 'no higher' : `${signedPct(criterion.max_change_pct)} or better`}</td>
              </tr>
            ))}
            <tr>
              <th scope="row">
                Quality gates <small>pass rate, first attempt</small>
              </th>
              <td>{percent(result.quality.treatmentPassRate)}</td>
              <td>{percent(result.quality.baselinePassRate)}</td>
              <td className={result.quality.met === null ? undefined : result.quality.met ? 'lab-met' : 'lab-missed'}>
                {result.quality.met === null ? '—' : result.quality.met ? 'no worse' : 'worse'}
              </td>
              <td>no worse</td>
            </tr>
            {experiment.recorded_checks?.map((check) => (
              <tr key={check.criterion}>
                <th scope="row">
                  {check.criterion} <small>recorded in {check.source}</small>
                </th>
                <td colSpan={2}>Measured outside the scorecards</td>
                <td className={check.outcome === 'pass' ? 'lab-met' : 'lab-missed'}>{check.outcome}</td>
                <td>pass</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="lab-rule">
        {experiment.prediction.criteria.length > 1 &&
          (experiment.prediction.combine === 'all' ? 'Every criterion must be met. ' : 'One criterion is enough. ')}
        Change is (treatment − baseline) ÷ baseline, computed from the scorecards.
      </p>
      {experiment.interpretation && (
        <aside className="lab-interpretation" aria-label="Experimenter interpretation">
          <h4>Interpretation</h4>
          <p>{experiment.interpretation}</p>
          <small>Written by the experimenter · does not change the status</small>
        </aside>
      )}
    </>
  )
}

export function LabNotebook({ experiments, runs }: { experiments: Experiment[]; runs: Run[] }) {
  const [experimentId, setExperimentId] = useState(
    () =>
      experiments.findLast((candidate) => evaluateExperiment(candidate, runs).status !== 'pending')?.id ??
      experiments.at(-1)?.id,
  )
  const experiment = experiments.find((candidate) => candidate.id === experimentId) ?? experiments.at(-1)
  if (!experiment) return null

  return (
    <section className="lab-notebook" aria-labelledby="lab-title">
      <header className="lab-notebook__header">
        <div>
          <p className="eyebrow">Experiment · {experiment.id}</p>
          <h1 id="lab-title">{experiment.title}</h1>
          <p className="lab-registered">
            {experiment.registered === 'before-runs'
              ? 'Hypothesis registered before the runs'
              : 'Hypothesis written after the runs · read the result with that in mind'}
          </p>
        </div>
        {experiments.length > 1 && (
          <label className="lab-picker">
            <span>Experiment</span>
            <select value={experiment.id} onChange={(event) => setExperimentId(event.target.value)}>
              {experiments.map((candidate) => (
                <option key={candidate.id} value={candidate.id}>
                  {candidate.title}
                </option>
              ))}
            </select>
          </label>
        )}
      </header>
      <ol className="lab-steps">
        <li>
          <h2>Hypothesis</h2>
          <p className="lab-hypothesis">{experiment.hypothesis}</p>
        </li>
        <li>
          <h2>Conditions</h2>
          <Conditions experiment={experiment} runs={runs} />
        </li>
        <li>
          <h2>Result</h2>
          <Result experiment={experiment} runs={runs} />
        </li>
      </ol>
    </section>
  )
}
