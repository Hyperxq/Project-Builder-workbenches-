import { describe, expect, it } from 'bun:test'
import { readFileSync } from 'node:fs'
import { runFactoryForTest } from '@pbuilder/sdk/testing'
import factory from './factory.ts'

const INPUT = { plural: 'books', title: 'Books', icon: 'BookOpen', description: 'Catalogue of books.' }
const FILES: string[] = ["src/routes/index.tsx"]
const seed = () => Object.fromEntries(FILES.map((f) => [f, readFileSync(f, 'utf8')]))

describe('overview-card', () => {
  it('edits, then changes nothing on a second run', async () => {
    const first = await runFactoryForTest(factory, INPUT, { seed: seed(), packageDir: import.meta.dir })
    expect(first.error).toBeUndefined()
    expect(first.tree.get("src/routes/index.tsx")).toContain("<CardTitle className=\"text-base\">Books</CardTitle>")
    const again = await runFactoryForTest(factory, INPUT, { seed: { ...seed(), ...Object.fromEntries(first.tree) }, packageDir: import.meta.dir })
    expect(again.error).toBeUndefined()
    expect([...again.tree.keys()]).toEqual([])
  })

  it('fails without writing when its file is missing', async () => {
    const result = await runFactoryForTest(factory, INPUT, { seed: {}, packageDir: import.meta.dir })
    expect(result.error).toBeDefined()
    expect(result.tree.size).toBe(0)
  })
})
