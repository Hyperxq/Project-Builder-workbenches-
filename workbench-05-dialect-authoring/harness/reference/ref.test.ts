import { describe, expect, it } from 'bun:test'
import { readFileSync, mkdirSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { runFactoryForTest } from '@pbuilder/sdk/testing'

const FILES = ['src/app/shell/app-sidebar.tsx', 'src/routes/index.tsx', 'mocks/handlers.ts', 'mocks/setup-test-mocking.ts', 'mocks/core/types.ts']
const seed = () => Object.fromEntries(FILES.map((f) => [f, readFileSync(join('seed', f), 'utf8')]))
const BOOKS = { singular: 'book', plural: 'books', title: 'Books', icon: 'BookOpen', description: 'Catalogue of books.' }
const inputFor = (name: string) => { const keys = Object.keys(JSON.parse(readFileSync(join('schematics', name, 'schema.json'), 'utf8')).properties); return Object.fromEntries(keys.map((k) => [k, (BOOKS as Record<string, string>)[k]])) }
const NAMES = ['sidebar-entry', 'overview-card', 'handlers-registration', 'route-keys']

for (const name of NAMES) {
  describe(name, async () => {
    const factory = (await import(`./schematics/${name}/factory.ts`)).default
    const packageDir = join(import.meta.dir, 'schematics', name)
    it('edits, then changes nothing on a second run', async () => {
      const first = await runFactoryForTest(factory, inputFor(name), { seed: seed(), packageDir })
      expect(first.error).toBeUndefined()
      expect(first.tree.size).toBeGreaterThan(0)
      for (const [path, content] of first.tree) {
        const out = join('out', name, path); mkdirSync(dirname(out), { recursive: true }); writeFileSync(out, content)
      }
      const again = await runFactoryForTest(factory, inputFor(name), { seed: { ...seed(), ...Object.fromEntries(first.tree) }, packageDir })
      expect(again.error).toBeUndefined()
      expect([...again.tree.keys()]).toEqual([])
    })
    it('fails without writing when the files are missing', async () => {
      const result = await runFactoryForTest(factory, inputFor(name), { seed: {}, packageDir })
      expect(result.error).toBeDefined()
      expect(result.tree.size).toBe(0)
    })
  })
}
