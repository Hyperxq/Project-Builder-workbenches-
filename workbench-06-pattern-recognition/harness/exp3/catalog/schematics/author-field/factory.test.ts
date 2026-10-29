import { describe, expect, it } from 'bun:test'
import { readFileSync } from 'node:fs'
import { runFactoryForTest } from '@pbuilder/sdk/testing'
import factory from './factory.ts'

const INPUT = { key: 'website', title: 'Website', schema: "z.url('Must be a valid URL')" }
const FILES: string[] = ["src/features/authors/domain/author.ts", "src/features/authors/presentation/author-form.tsx", "mocks/domains/authors.mock.ts", "src/features/authors/presentation/author-detail-page.tsx"]
const seed = () => Object.fromEntries(FILES.map((f) => [f, readFileSync(f, 'utf8')]))

describe('author-field', () => {
  it('edits, then changes nothing on a second run', async () => {
    const first = await runFactoryForTest(factory, INPUT, { seed: seed(), packageDir: import.meta.dir })
    expect(first.error).toBeUndefined()
    expect(first.tree.get("src/features/authors/domain/author.ts")).toContain("website: z.url('Must be a valid URL').optional(),")
    expect(first.tree.get("mocks/domains/authors.mock.ts")).toContain("website: merged.website?.trim() || undefined,")
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
