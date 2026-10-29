import * as react from '@pbuilder/sdk/react'
import type { Input } from './schema.generated.ts'

const PATH = 'src/app/shell/app-sidebar.tsx'

export default async ({ plural, title, icon }: Input) => {
  await react
    .find(PATH)
    .addImport(icon, 'lucide-react', { position: 'sorted' })
    .addArrayElement({ variable: 'NAV', path: [] }, { expression: `{ to: '/${plural}', label: '${title}', icon: ${icon} }` })
}
