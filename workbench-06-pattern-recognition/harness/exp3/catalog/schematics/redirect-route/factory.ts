import { create, find } from '@pbuilder/sdk/commons'
import type { Input } from './schema.generated.ts'

export default async ({ slug, to }: Input) => {
  const route = `src/routes/${slug}.tsx`
  if ((await find(route).read()) !== undefined) return
  create(route, {
    template: `import { createFileRoute, redirect } from '@tanstack/react-router'

export const Route = createFileRoute('/${slug}')({
  beforeLoad: () => {
    throw redirect({ to: '${to}' })
  },
})
`,
    options: {},
  })
}
