import { describe, expect, it } from 'vitest'
import type { Bench, Run } from './results'
import { batchSeries, breakEvenBatch, latestRuns, parseRun } from './results'

function bench(cost: number): Bench {
  return {
    date: '2026-08-11T00:00:00Z',
    arm: 'with-schematics',
    task: 'batch 1',
    agent: {
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

function run(arm: Run['arm'], batch: number | undefined, cost: number, stamp = '2026-08-11_10-00'): Run {
  return { workbench: 'workbench-02-react-admin', stamp, arm, batch, bench: bench(cost) }
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
