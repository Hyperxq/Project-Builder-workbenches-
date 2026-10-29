import { find, replaceContent } from '@pbuilder/sdk/commons'
import type { Input } from './schema.generated.ts'

const PAGE = 'src/features/authors/presentation/authors-page.tsx'
const HEAD = '                  <TableHead>Status</TableHead>'
const CELL = '                    <TableCell>\n                      <ActiveBadge'

export default async ({ key, title }: Input) => {
  const source = await find(PAGE).read()
  if (source === undefined) throw new Error(`${PAGE}: file not found`)
  if (source.includes(`{author.${key} ?? '—'}</TableCell>`)) return
  for (const anchor of [HEAD, CELL]) {
    if (source.split(anchor).length !== 2) throw new Error(`${PAGE}: expected exactly one ${JSON.stringify(anchor)}`)
  }
  await replaceContent(
    PAGE,
    source
      .replace(HEAD, `                  <TableHead>${title}</TableHead>\n${HEAD}`)
      .replace(CELL, `                    <TableCell className="text-muted-foreground">{author.${key} ?? '—'}</TableCell>\n${CELL}`),
  )
}
