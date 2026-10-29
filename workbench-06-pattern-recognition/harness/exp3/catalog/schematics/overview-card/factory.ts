import * as react from '@pbuilder/sdk/react'
import type { Input } from './schema.generated.ts'

const PATH = 'src/routes/index.tsx'

const card = ({ plural, title, icon, description }: Input) => `<Link to="/${plural}" className="group rounded-lg outline-none focus-visible:ring-2 focus-visible:ring-ring">
  <Card className="h-full transition-colors group-hover:bg-popover">
    <CardHeader>
      <div className="flex items-center justify-between">
        <${icon} className="size-4 text-muted-foreground" aria-hidden />
        <ArrowRight
          className="size-4 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100"
          aria-hidden
        />
      </div>
      <CardTitle className="text-base">${title}</CardTitle>
      <CardDescription>${description}</CardDescription>
    </CardHeader>
  </Card>
</Link>`

// addJsxChild indents only the first line, so the rest of the block carries the siblings' indentation itself.
const indent = (block: string, by: string) => block.replaceAll('\n', `\n${by}`)

export default async (input: Input) => {
  await react
    .find(PATH)
    .addImport(input.icon, 'lucide-react', { position: 'sorted' })
    .addJsxChild({ tag: 'section', props: { 'aria-label': '"Entities"' } }, indent(card(input), '        '))
}
