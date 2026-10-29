import { describe, expect, it } from 'bun:test'
import { readFileSync } from 'node:fs'
import { runFactoryForTest } from '@pbuilder/sdk/testing'
import factory from './factory.ts'

const INPUT = { slug: 'writers', to: '/authors' }
const FILES: string[] = []
const seed = () => Object.fromEntries(FILES.map((f) => [f, readFileSync(f, 'utf8')]))

describe('redirect-route', () => {
  it('edits, then changes nothing on a second run', async () => {
    const first = await runFactoryForTest(factory, INPUT, { seed: seed(), packageDir: import.meta.dir })
    expect(first.error).toBeUndefined()
    expect(first.tree.get("src/routes/writers.tsx")).toContain("throw redirect({ to: '/authors' })")
    const again = await runFactoryForTest(factory, INPUT, { seed: { ...seed(), ...Object.fromEntries(first.tree) }, packageDir: import.meta.dir })
    expect(again.error).toBeUndefined()
    expect([...again.tree.keys()]).toEqual([])
  })
})
