import { create, find } from '@pbuilder/sdk/commons'
import * as react from '@pbuilder/sdk/react'
import type { Input } from './schema.generated.ts'

const SIDEBAR = 'src/app/shell/app-sidebar.tsx'

const pascal = (slug: string) => slug.split('-').map((p) => p.charAt(0).toUpperCase() + p.slice(1)).join('')

export default async ({ slug, title, icon, body }: Input) => {
  if ((await find(SIDEBAR).read()) === undefined) throw new Error(`${SIDEBAR}: file not found`)
  const route = `src/routes/${slug}.tsx`
  if ((await find(route).read()) === undefined) {
    const name = `${pascal(slug)}Page`
    create(route, {
      template: `import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/${slug}')({
  component: ${name},
})

function ${name}() {
  return (
    <div className="mx-auto max-w-5xl p-8">
      <h1 className="text-2xl font-semibold tracking-tight">${title}</h1>
      <p className="mt-1 text-sm text-muted-foreground">${body}</p>
    </div>
  )
}
`,
      options: {},
    })
  }
  await react
    .find(SIDEBAR)
    .addImport(icon, 'lucide-react', { position: 'sorted' })
    .addArrayElement({ variable: 'NAV', path: [] }, { expression: `{ to: '/${slug}', label: '${title}', icon: ${icon} }` })
}
