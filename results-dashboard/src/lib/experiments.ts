/**
 * Declared experiments: a hypothesis written as a measurable prediction, two
 * cohorts of runs to compare, and the status the scorecards give it. The
 * experimenter's interpretation is displayed beside the status, never used
 * to compute it.
 */
import type { Arm, Run } from './results'
import { latestRuns, sweepKey } from './results'

export type Metric = 'cost_usd' | 'wall_seconds' | 'api_seconds' | 'tokens_all'

export interface Criterion {
  metric: Metric
  aggregate: 'sum' | 'median'
  /** Met when (treatment − baseline) / baseline × 100 is at or below this value. */
  max_change_pct: number
}

export interface Cohort {
  label: string
  sweeps: string[]
  /** Both arms when omitted. */
  arms?: Arm[]
  expected_runs?: number
}

/** A measurement taken outside the scorecards (a review, an audit), with where it is documented. */
export interface RecordedCheck {
  criterion: string
  outcome: 'pass' | 'fail'
  source: string
}

export interface Experiment {
  id: string
  title: string
  registered: 'before-runs' | 'after-runs'
  hypothesis: string
  variable: string
  constants: string[]
  treatment: Cohort
  baseline: Cohort
  prediction: { combine: 'all' | 'any'; criteria: Criterion[] }
  recorded_checks?: RecordedCheck[]
  interpretation?: string
}

export type HypothesisStatus = 'supported' | 'refuted' | 'inconclusive' | 'pending'

export interface CriterionResult {
  criterion: Criterion
  treatment: number | null
  baseline: number | null
  changePct: number | null
  met: boolean | null
}

export interface ExperimentResult {
  status: HypothesisStatus
  reason: string
  runs: { treatment: number; baseline: number }
  criteria: CriterionResult[]
  quality: { treatmentPassRate: number | null; baselinePassRate: number | null; met: boolean | null }
}

export function cohortRuns(runs: Run[], cohort: Cohort): Run[] {
  return cohort.sweeps.flatMap((sweep) =>
    latestRuns(
      runs.filter((run) => sweepKey(run) === sweep && (!cohort.arms || cohort.arms.includes(run.arm))),
    ),
  )
}

function metricValue(run: Run, metric: Metric): number | null {
  const agent = run.bench.agent
  if (metric === 'cost_usd') return agent.cost_usd
  if (metric === 'wall_seconds') return agent.wall_seconds
  if (metric === 'api_seconds') return agent.api_seconds
  const t = agent.tokens
  if (!t) return null
  return (
    (t.input_tokens ?? 0) +
    (t.output_tokens ?? 0) +
    (t.cache_read_input_tokens ?? 0) +
    (t.cache_creation_input_tokens ?? 0)
  )
}

function aggregate(runs: Run[], criterion: Criterion): number | null {
  const values = runs.map((run) => metricValue(run, criterion.metric))
  if (values.length === 0 || values.some((value) => value === null)) return null
  const numbers = (values as number[]).sort((a, b) => a - b)
  if (criterion.aggregate === 'sum') return numbers.reduce((total, value) => total + value, 0)
  const middle = Math.floor(numbers.length / 2)
  return numbers.length % 2 ? numbers[middle] : (numbers[middle - 1] + numbers[middle]) / 2
}

const passRate = (runs: Run[]) =>
  runs.length === 0
    ? null
    : runs.filter((run) => run.bench.agent.exit_code === 0 && run.bench.definition_of_done.first_attempt_pass)
        .length / runs.length

export function evaluateExperiment(experiment: Experiment, runs: Run[]): ExperimentResult {
  const treatment = cohortRuns(runs, experiment.treatment)
  const baseline = cohortRuns(runs, experiment.baseline)
  const criteria = experiment.prediction.criteria.map((criterion): CriterionResult => {
    const t = aggregate(treatment, criterion)
    const b = aggregate(baseline, criterion)
    const changePct = t === null || b === null || b === 0 ? null : ((t - b) / b) * 100
    return { criterion, treatment: t, baseline: b, changePct, met: changePct === null ? null : changePct <= criterion.max_change_pct }
  })
  const treatmentPassRate = passRate(treatment)
  const baselinePassRate = passRate(baseline)
  const quality = {
    treatmentPassRate,
    baselinePassRate,
    met: treatmentPassRate === null || baselinePassRate === null ? null : treatmentPassRate >= baselinePassRate,
  }
  const result = (status: HypothesisStatus, reason: string): ExperimentResult => ({
    status,
    reason,
    runs: { treatment: treatment.length, baseline: baseline.length },
    criteria,
    quality,
  })

  if (treatment.length === 0 || baseline.length === 0) return result('pending', 'No runs recorded yet for one of the cohorts')
  for (const cohort of [experiment.treatment, experiment.baseline]) {
    const count = cohort === experiment.treatment ? treatment.length : baseline.length
    if (cohort.expected_runs && count < cohort.expected_runs) {
      return result('inconclusive', `${count} of ${cohort.expected_runs} ${cohort.label} runs recorded`)
    }
  }
  if (criteria.some((c) => c.met === null)) return result('inconclusive', 'A predicted metric was not captured')
  if (!quality.met) return result('refuted', 'The treatment passed its quality gates less often than the baseline')
  const predicted =
    experiment.prediction.combine === 'all' ? criteria.every((c) => c.met) : criteria.some((c) => c.met)
  if (!predicted) return result('refuted', 'The predicted change was not reached')
  const failed = experiment.recorded_checks?.find((check) => check.outcome === 'fail')
  if (failed) return result('refuted', `Recorded check failed: ${failed.criterion}`)
  return result('supported', 'Every predicted change was reached at no worse quality')
}
