import { describe, expect, it } from 'vitest'
import type { Experiment } from './experiments'
import { renderLlmsTxt } from './llms'
import type { Arm, Run, WorkbenchMeta } from './results'

const WB = 'workbench-09-demo'

function run(arm: Arm, sweep: string, { cost = 1, stamp = '2026-10-28_10-00', pass = true } = {}): Run {
  return {
    workbench: WB,
    stamp,
    arm,
    batch: 1,
    model: 'claude-opus-5-5',
    bench: {
      date: '2026-10-28T10:00:00Z',
      arm,
      task: 'batch 1',
      agent: {
        model: 'claude-opus-5-5',
        exit_code: 0,
        wall_seconds: 100,
        api_seconds: 50,
        num_turns: 10,
        tokens: { input_tokens: 10, output_tokens: 10 },
        cost_usd: cost,
        session_id: 'x',
      },
      run: { sweep_id: sweep },
      definition_of_done: { first_attempt_pass: pass, gates: [] },
      output: { files_created: 1, loc_delta: 1 },
    },
  }
}

const experiment = (id: string, sweep: string, overrides: Partial<Experiment> = {}): Experiment => ({
  id,
  title: `Title ${id}`,
  registered: 'before-runs',
  hypothesis: `Hypothesis ${id}`,
  variable: `Variable ${id}`,
  constants: [],
  treatment: { label: 'With schematics', sweeps: [sweep], arms: ['with-schematics'] },
  baseline: { label: 'Without schematics', sweeps: [sweep], arms: ['without-schematics'] },
  prediction: { combine: 'all', criteria: [{ metric: 'cost_usd', aggregate: 'sum', max_change_pct: -30 }] },
  ...overrides,
})

const meta = (experiments: Experiment[]): Map<string, WorkbenchMeta> =>
  new Map([[WB, { title: 'Demo workbench', about: 'About demo.', proves: 'Proves demo.', experiments }]])

const options = { generatedAt: '2026-10-29T00:00:00Z', siteUrl: 'https://example.test/' }

const section = (text: string, heading: string) => text.split(heading)[1]?.split(/\n## /)[0] ?? ''

describe('renderLlmsTxt', () => {
  it('puts the last declared experiment with runs under Latest and every other one under History', () => {
    const text = renderLlmsTxt(
      meta([experiment('old', 's-old'), experiment('new', 's-new'), experiment('planned', 's-planned')]),
      [
        run('with-schematics', 's-old', { stamp: '2026-10-01_10-00' }),
        run('without-schematics', 's-old', { stamp: '2026-10-01_10-00' }),
        run('with-schematics', 's-new', { cost: 5, stamp: '2026-10-20_10-00' }),
        run('without-schematics', 's-new', { cost: 10, stamp: '2026-10-20_10-00' }),
      ],
      options,
    )
    const latest = section(text, '## Latest')
    const history = section(text, '## History')
    expect(latest).toContain('`new`')
    expect(latest).not.toContain('`old`')
    expect(history).toContain('`old`')
    expect(history).toContain('`planned`')
    expect(history.indexOf('`planned`')).toBeLessThan(history.indexOf('`old`'))
  })

  it('reports the status the scorecards give, with each criterion measured', () => {
    const text = renderLlmsTxt(
      meta([experiment('new', 's1')]),
      [run('with-schematics', 's1', { cost: 5 }), run('without-schematics', 's1', { cost: 10 })],
      options,
    )
    const latest = section(text, '## Latest')
    expect(latest).toContain('Status: supported')
    expect(latest).toContain('sum cost_usd: 5 against 10 (-50%, met; needs ≤ -30%)')
    expect(latest).toContain('Hypothesis new')
    expect(latest).toContain('README: workbench-09-demo/README.md')
  })

  it('marks an experiment without runs as pending', () => {
    const text = renderLlmsTxt(meta([experiment('planned', 's1')]), [], options)
    expect(section(text, '## Latest')).toContain('Status: pending')
  })

  it('names where it was generated from and the dashboard', () => {
    const text = renderLlmsTxt(meta([]), [], options)
    expect(text.startsWith('# ')).toBe(true)
    expect(text).toContain('Generated 2026-10-29T00:00:00Z')
    expect(text).toContain('https://example.test/')
  })
})
