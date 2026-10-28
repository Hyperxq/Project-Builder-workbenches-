import { describe, expect, it } from 'vitest'
import type { Experiment } from './experiments'
import { cohortRuns, evaluateExperiment } from './experiments'
import type { Arm, Run } from './results'
import { loadRuns, loadWorkbenchMeta } from './results'

function run(
  arm: Arm,
  sweep: string,
  batch: number,
  { cost = 1, wall = 100, pass = true, stamp = '2026-10-28_10-00', tokens = 1000 } = {},
): Run {
  return {
    workbench: 'workbench-03-react-admin-harness',
    stamp,
    arm,
    batch,
    model: 'claude-opus-5-5',
    bench: {
      date: '2026-10-28T10:00:00Z',
      arm,
      task: `batch ${batch}`,
      agent: {
        model: 'claude-opus-5-5',
        exit_code: 0,
        wall_seconds: wall,
        api_seconds: wall / 2,
        num_turns: 10,
        tokens: { input_tokens: tokens, output_tokens: 0, cache_read_input_tokens: tokens },
        cost_usd: cost,
        session_id: 'x',
      },
      run: { sweep_id: sweep },
      definition_of_done: { first_attempt_pass: pass, gates: [] },
      output: { files_created: 1, loc_delta: 1 },
    },
  }
}

const experiment = (overrides: Partial<Experiment> = {}): Experiment => ({
  id: 'wb03-v3',
  title: 'Dialects',
  registered: 'before-runs',
  hypothesis: 'The schematics arm costs at least 30% less.',
  variable: 'plan directive',
  constants: ['model'],
  treatment: { label: 'With schematics', sweeps: ['s1'], arms: ['with-schematics'] },
  baseline: { label: 'Without schematics', sweeps: ['s1'], arms: ['without-schematics'] },
  prediction: { combine: 'all', criteria: [{ metric: 'cost_usd', aggregate: 'sum', max_change_pct: -30 }] },
  ...overrides,
})

describe('cohortRuns', () => {
  it('keeps the latest attempt per sweep, arm and batch, never merging sweeps', () => {
    const runs = [
      run('with-schematics', 'rep1', 1, { cost: 5, stamp: '2026-10-28_10-00' }),
      run('with-schematics', 'rep1', 1, { cost: 2, stamp: '2026-10-28_11-00' }),
      run('with-schematics', 'rep2', 1, { cost: 3 }),
      run('without-schematics', 'rep1', 1, { cost: 9 }),
    ]
    const selected = cohortRuns(runs, { label: 'B', sweeps: ['rep1', 'rep2'], arms: ['with-schematics'] })
    expect(selected.map((r) => r.bench.agent.cost_usd).sort()).toEqual([2, 3])
  })

  it('includes both arms when the cohort names none', () => {
    const runs = [run('with-schematics', 's1', 1), run('without-schematics', 's1', 1)]
    expect(cohortRuns(runs, { label: 'all', sweeps: ['s1'] })).toHaveLength(2)
  })
})

describe('evaluateExperiment', () => {
  it('is pending while a cohort has no runs', () => {
    const result = evaluateExperiment(experiment(), [run('with-schematics', 's1', 1)])
    expect(result.status).toBe('pending')
    expect(result.runs).toEqual({ treatment: 1, baseline: 0 })
  })

  it('supports the hypothesis when every criterion is met at no worse quality', () => {
    const runs = [
      run('with-schematics', 's1', 1, { cost: 3 }),
      run('with-schematics', 's1', 2, { cost: 3 }),
      run('without-schematics', 's1', 1, { cost: 5 }),
      run('without-schematics', 's1', 2, { cost: 5 }),
    ]
    const result = evaluateExperiment(experiment(), runs)
    expect(result.status).toBe('supported')
    expect(result.criteria[0]).toMatchObject({ treatment: 6, baseline: 10, changePct: -40, met: true })
  })

  it('refutes the hypothesis when the threshold is missed', () => {
    const runs = [run('with-schematics', 's1', 1, { cost: 8 }), run('without-schematics', 's1', 1, { cost: 10 })]
    const result = evaluateExperiment(experiment(), runs)
    expect(result.status).toBe('refuted')
    expect(result.criteria[0]).toMatchObject({ changePct: -20, met: false })
  })

  it('refutes the hypothesis when the treatment passes its gates less often', () => {
    const runs = [
      run('with-schematics', 's1', 1, { cost: 1, pass: false }),
      run('without-schematics', 's1', 1, { cost: 10 }),
    ]
    const result = evaluateExperiment(experiment(), runs)
    expect(result.status).toBe('refuted')
    expect(result.quality).toMatchObject({ treatmentPassRate: 0, baselinePassRate: 1, met: false })
  })

  it('accepts any one criterion when the prediction combines with any', () => {
    const exp = experiment({
      prediction: {
        combine: 'any',
        criteria: [
          { metric: 'cost_usd', aggregate: 'median', max_change_pct: -30 },
          { metric: 'wall_seconds', aggregate: 'median', max_change_pct: -30 },
        ],
      },
    })
    const runs = [
      run('with-schematics', 's1', 1, { cost: 9, wall: 50 }),
      run('without-schematics', 's1', 1, { cost: 10, wall: 100 }),
    ]
    expect(evaluateExperiment(exp, runs).status).toBe('supported')
  })

  it('takes the median per run and counts cache reads in tokens_all', () => {
    const exp = experiment({
      prediction: { combine: 'all', criteria: [{ metric: 'tokens_all', aggregate: 'median', max_change_pct: 0 }] },
    })
    const runs = [
      run('with-schematics', 's1', 1, { tokens: 100 }),
      run('with-schematics', 's1', 2, { tokens: 300 }),
      run('with-schematics', 's1', 3, { tokens: 900 }),
      run('without-schematics', 's1', 1, { tokens: 500 }),
    ]
    expect(evaluateExperiment(exp, runs).criteria[0]).toMatchObject({ treatment: 600, baseline: 1000 })
  })

  it('is inconclusive while fewer runs than expected are recorded', () => {
    const exp = experiment({
      treatment: { label: 'With schematics', sweeps: ['s1'], arms: ['with-schematics'], expected_runs: 5 },
    })
    const runs = [run('with-schematics', 's1', 1, { cost: 1 }), run('without-schematics', 's1', 1, { cost: 10 })]
    const result = evaluateExperiment(exp, runs)
    expect(result.status).toBe('inconclusive')
    expect(result.reason).toBe('1 of 5 With schematics runs recorded')
  })

  it('refutes the hypothesis when a recorded check outside the scorecards failed', () => {
    const exp = experiment({
      recorded_checks: [{ criterion: 'No more review rounds', outcome: 'fail', source: 'EXPERIMENT.md' }],
    })
    const runs = [run('with-schematics', 's1', 1, { cost: 1 }), run('without-schematics', 's1', 1, { cost: 10 })]
    const result = evaluateExperiment(exp, runs)
    expect(result.status).toBe('refuted')
    expect(result.reason).toBe('Recorded check failed: No more review rounds')
  })
})

describe('declared experiments', () => {
  const runs = loadRuns()
  const declared = [...loadWorkbenchMeta()].flatMap(([workbench, meta]) =>
    (meta.experiments ?? []).map((exp) => ({ workbench, exp })),
  )

  it('declares at least one experiment', () => {
    expect(declared.length).toBeGreaterThan(0)
  })

  it.each(declared.map(({ workbench, exp }) => [exp.id, workbench, exp] as const))(
    '%s is well formed',
    (_id, workbench, exp) => {
      const metrics = ['cost_usd', 'wall_seconds', 'api_seconds', 'tokens_all']
      expect(exp.prediction.criteria.length).toBeGreaterThan(0)
      for (const criterion of exp.prediction.criteria) {
        expect(metrics).toContain(criterion.metric)
        expect(['sum', 'median']).toContain(criterion.aggregate)
      }
      for (const cohort of [exp.treatment, exp.baseline]) {
        expect(cohort.sweeps.length).toBeGreaterThan(0)
        for (const arm of cohort.arms ?? []) expect(['with-schematics', 'without-schematics']).toContain(arm)
      }
      if (exp.registered === 'after-runs') {
        const result = evaluateExperiment(exp, runs.filter((run) => run.workbench === workbench))
        expect(result.status).not.toBe('pending')
      }
    },
  )
})
