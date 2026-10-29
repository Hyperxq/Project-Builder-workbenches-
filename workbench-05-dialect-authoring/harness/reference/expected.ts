import { readFileSync, mkdirSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { runFactoryForTest } from '@pbuilder/sdk/testing'

const FILES = ['src/app/shell/app-sidebar.tsx', 'src/routes/index.tsx', 'mocks/handlers.ts', 'mocks/setup-test-mocking.ts', 'mocks/core/types.ts']
const ENTITIES = JSON.parse(readFileSync(process.argv[2], 'utf8')) as Record<string, string>[]
const NAMES = ['sidebar-entry', 'overview-card', 'handlers-registration', 'route-keys']
let tree: Record<string, string> = Object.fromEntries(FILES.map((f) => [f, readFileSync(join('seed', f), 'utf8')]))
for (const entity of ENTITIES) {
  for (const name of NAMES) {
    const keys = Object.keys(JSON.parse(readFileSync(join('schematics', name, 'schema.json'), 'utf8')).properties)
    const factory = (await import(`./schematics/${name}/factory.ts`)).default
    const result = await runFactoryForTest(factory, Object.fromEntries(keys.map((k) => [k, entity[k]])), { seed: tree, packageDir: join(import.meta.dir, 'schematics', name) })
    if (result.error) throw result.error
    tree = { ...tree, ...Object.fromEntries(result.tree) }
  }
}
for (const [path, content] of Object.entries(tree)) { const out = join(process.argv[3], path); mkdirSync(dirname(out), { recursive: true }); writeFileSync(out, content) }
