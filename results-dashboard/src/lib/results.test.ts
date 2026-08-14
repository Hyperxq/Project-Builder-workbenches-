import { describe, expect, it } from 'vitest'
import type { Bench, Run } from './results'
import {
  agentNote,
  batchSeries,
  breakEvenBatch,
  evaluateRunSet,
  extractFinalReport,
  groupByModel,
  groupBySweep,
  latestRuns,
  parseRun,
} from './results'

function bench(cost: number, model?: string): Bench {
  return {
    date: '2026-08-11T00:00:00Z',
    arm: 'with-schematics',
    task: 'batch 1',
    agent: {
      model,
      exit_code: 0,
      wall_seconds: 100,
      api_seconds: 90,
      num_turns: 10,
      tokens: { input_tokens: 1000, output_tokens: 500 },
      cost_usd: cost,
      session_id: 'x',
    },
    definition_of_done: { first_attempt_pass: true, gates: [] },
    output: { files_created: 5, loc_delta: 100 },
  }
}

function run(
  arm: Run['arm'],
  batch: number | undefined,
  cost: number,
  stamp = '2026-08-11_10-00',
  model = 'claude-sonnet-5',
): Run {
  return { workbench: 'workbench-02-react-admin', stamp, arm, batch, model, bench: bench(cost, model) }
}

describe('parseRun', () => {
  it('parses batched and plain run directories', () => {
    const batched = parseRun(
      '../../../workbench-02-react-admin/results/2026-08-11_10-00_with-schematics_batch3/bench.json',
      bench(1),
    )
    expect(batched).toMatchObject({
      workbench: 'workbench-02-react-admin',
      arm: 'with-schematics',
      batch: 3,
      stamp: '2026-08-11_10-00',
    })

    const plain = parseRun(
      '../../../workbench-01-nest-graphql-api/results/2026-08-10_21-28_without-schematics/bench.json',
      bench(1),
    )
    expect(plain).toMatchObject({ arm: 'without-schematics', batch: undefined })
  })

  it('rejects non-run directories', () => {
    expect(
      parseRun('../../../workbench-01-nest-graphql-api/results/notes/bench.json', bench(1)),
    ).toBeNull()
  })

  it('derives model from bench.agent.model, falling back to unknown', () => {
    const withModel = parseRun(
      '../../../workbench-02-react-admin/results/2026-08-11_10-00_with-schematics_batch1/bench.json',
      bench(1, 'claude-opus-5'),
    )
    expect(withModel?.model).toBe('claude-opus-5')

    const withoutModel = parseRun(
      '../../../workbench-02-react-admin/results/2026-08-11_10-00_with-schematics_batch1/bench.json',
      bench(1),
    )
    expect(withoutModel?.model).toBe('unknown')
  })
})

describe('latestRuns', () => {
  it('keeps only the newest run per arm+batch', () => {
    const runs = [
      run('with-schematics', 1, 5, '2026-08-11_10-00'),
      run('with-schematics', 1, 3, '2026-08-11_12-00'),
      run('without-schematics', 1, 4, '2026-08-11_11-00'),
    ]
    const latest = latestRuns(runs)
    expect(latest).toHaveLength(2)
    expect(latest.find((r) => r.arm === 'with-schematics')?.bench.agent.cost_usd).toBe(3)
  })

  it('does not let a rerun under a different model supersede the original', () => {
    const runs = [
      run('with-schematics', 1, 5, '2026-08-11_10-00', 'claude-sonnet-5'),
      run('with-schematics', 1, 3, '2026-08-12_09-00', 'claude-opus-5'),
    ]
    const latest = latestRuns(runs)
    expect(latest).toHaveLength(2)
    expect(latest.find((r) => r.model === 'claude-sonnet-5')?.bench.agent.cost_usd).toBe(5)
    expect(latest.find((r) => r.model === 'claude-opus-5')?.bench.agent.cost_usd).toBe(3)
  })

  it('still supersedes reruns within the same model', () => {
    const runs = [
      run('with-schematics', 1, 5, '2026-08-11_10-00', 'claude-sonnet-5'),
      run('with-schematics', 1, 3, '2026-08-12_09-00', 'claude-sonnet-5'),
    ]
    const latest = latestRuns(runs)
    expect(latest).toHaveLength(1)
    expect(latest[0].bench.agent.cost_usd).toBe(3)
  })
})

describe('groupByModel', () => {
  it('buckets runs by model, preserving unknown as its own bucket', () => {
    const runs = [
      run('with-schematics', 1, 5, '2026-08-11_10-00', 'claude-sonnet-5'),
      run('without-schematics', 1, 4, '2026-08-11_10-00', 'claude-sonnet-5'),
      run('with-schematics', 1, 6, '2026-08-12_09-00', 'claude-opus-5'),
      run('with-schematics', 2, 2, '2026-08-10_09-00', 'unknown'),
    ]
    const groups = groupByModel(runs)
    expect([...groups.keys()].sort()).toEqual(['claude-opus-5', 'claude-sonnet-5', 'unknown'])
    expect(groups.get('claude-sonnet-5')).toHaveLength(2)
    expect(groups.get('claude-opus-5')).toHaveLength(1)
    expect(groups.get('unknown')).toHaveLength(1)
  })
})

describe('batchSeries + breakEvenBatch', () => {
  it('accumulates per arm and finds the break-even batch', () => {
    const runs = [
      run('with-schematics', 1, 10),
      run('without-schematics', 1, 4),
      run('with-schematics', 2, 1),
      run('without-schematics', 2, 4),
      run('with-schematics', 3, 1),
      run('without-schematics', 3, 4),
    ]
    const points = batchSeries(runs)
    expect(points.map((p) => p.withCum)).toEqual([10, 11, 12])
    expect(points.map((p) => p.withoutCum)).toEqual([4, 8, 12])
    expect(breakEvenBatch(points)).toBe(3)
  })

  it('nulls cumulative values once a batch is missing for an arm', () => {
    const runs = [
      run('with-schematics', 1, 10),
      run('without-schematics', 1, 4),
      run('without-schematics', 2, 4),
    ]
    const points = batchSeries(runs)
    expect(points[1].withCum).toBeNull()
    expect(points[1].withoutCum).toBe(8)
    expect(breakEvenBatch(points)).toBeNull()
  })
})

describe('groupBySweep', () => {
  it('keeps explicitly identified executions separate', () => {
    const first = run('with-schematics', 1, 5)
    first.bench.run = { sweep_id: 'sweep-a', protocol_version: 'v2' }
    const second = run('without-schematics', 1, 4)
    second.bench.run = { sweep_id: 'sweep-b', protocol_version: 'v2' }

    const sweeps = groupBySweep([first, second])

    expect([...sweeps.keys()]).toEqual(['sweep-a', 'sweep-b'])
  })

  it('groups legacy results by model without inventing cross-model sweeps', () => {
    const runs = [
      run('with-schematics', 1, 5, '2026-08-11_10-00', 'claude-sonnet-5'),
      run('without-schematics', 1, 4, '2026-08-11_11-00', 'claude-sonnet-5'),
      run('with-schematics', 1, 6, '2026-08-12_09-00', 'claude-opus-5'),
    ]

    expect([...groupBySweep(runs).keys()].sort()).toEqual([
      'legacy:claude-opus-5',
      'legacy:claude-sonnet-5',
    ])
  })
})

describe('evaluateRunSet', () => {
  it('computes the measured outcome without an agent interpretation step', () => {
    const evaluation = evaluateRunSet([
      run('with-schematics', 1, 10),
      run('without-schematics', 1, 5),
      run('with-schematics', 2, 8),
      run('without-schematics', 2, 6),
    ])

    expect(evaluation).toMatchObject({
      winner: 'without-schematics',
      headline: 'Without schematics costs less overall',
      validRuns: 4,
      totalRuns: 4,
      quality: 'both-pass',
    })
    expect(evaluation.costs).toEqual({ withSchematics: 18, withoutSchematics: 11 })
  })

  it('is inconclusive when a quality gate fails', () => {
    const failed = run('with-schematics', 1, 4)
    failed.bench.definition_of_done.first_attempt_pass = false

    expect(evaluateRunSet([failed, run('without-schematics', 1, 5)]).winner).toBe('inconclusive')
  })
})

describe('agent reports', () => {
  it('extracts the final self-report from a Claude JSONL stream', () => {
    const stream = [
      JSON.stringify({ type: 'assistant', message: 'working' }),
      JSON.stringify({ type: 'result', result: 'All gates passed. Verification required two fixes.' }),
    ].join('\n')

    expect(extractFinalReport(stream)).toBe('All gates passed. Verification required two fixes.')
  })

  it('selects a verification paragraph for the visible run note', () => {
    const note = agentNote(
      'The batch shipped successfully.\n\nVerification took the most follow-up because two E2E assertions failed and were fixed.\n\nEverything is green.',
    )

    expect(note?.headline).toBe('Verification took the most follow-up because two E2E assertions failed and were fixed.')
    expect(note?.source).toBe('Agent final report')
  })

  it('prefers a concrete failure explanation over a mention of a verification plan', () => {
    const note = agentNote(
      'Phase 1 — PLAN: delegation plan and verification plan recorded.\n\nPhase 3 — VERIFY: five E2E failures were diagnosed and fixed; none required a source change.',
    )

    expect(note?.headline).toBe(
      'Phase 3 — VERIFY: five E2E failures were diagnosed and fixed; none required a source change.',
    )
  })
})
