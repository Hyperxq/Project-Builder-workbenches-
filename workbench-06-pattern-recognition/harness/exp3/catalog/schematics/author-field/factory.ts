import { find, replaceContent } from '@pbuilder/sdk/commons'
import type { Input } from './schema.generated.ts'

const DOMAIN = 'src/features/authors/domain/author.ts'
const FORM = 'src/features/authors/presentation/author-form.tsx'
const MOCK = 'mocks/domains/authors.mock.ts'
const DETAIL = 'src/features/authors/presentation/author-detail-page.tsx'

/** Inserts `text` before every `anchor`, unless `marker` is already in the file. */
async function insertBefore(path: string, anchors: string[], text: (anchor: number) => string, marker: string) {
  const source = await find(path).read()
  if (source === undefined) throw new Error(`${path}: file not found`)
  if (source.includes(marker)) return
  let next = source
  anchors.forEach((anchor, i) => {
    if (next.split(anchor).length !== 2) throw new Error(`${path}: expected exactly one ${JSON.stringify(anchor)}`)
    next = next.replace(anchor, text(i) + anchor)
  })
  await replaceContent(path, next)
}

export default async ({ key, title, schema, number = false }: Input) => {
  const register = number
    ? `
          type="number"
          {...register('${key}', {
            setValueAs: (value) => (value === '' || value === undefined ? undefined : Number(value)),
          })}`
    : `
          {...register('${key}', {
            setValueAs: (value) =>
              typeof value === 'string' && value.trim() === '' ? undefined : value,
          })}`
  const stored = (source: string) => (number ? `${source}.${key}` : `${source}.${key}?.trim() || undefined`)

  await insertBefore(DOMAIN, ['  active: z.boolean(),\n})'], () => `  ${key}: ${schema}.optional(),\n`, `  ${key}: `)
  await insertBefore(
    FORM,
    ['      <Controller'],
    () => `      <div className="space-y-2">
        <Label htmlFor="${key}">
          ${title} <span className="text-muted-foreground">(optional)</span>
        </Label>
        <Input
          id="${key}"
          aria-invalid={errors.${key} !== undefined}${register}
        />
        {errors.${key} && (
          <p role="alert" className="text-xs text-destructive">
            {errors.${key}.message}
          </p>
        )}
      </div>

`,
    `id="${key}"`,
  )
  await insertBefore(
    MOCK,
    ['        active: body.active ?? true,', '        active: merged.active ?? existing.active,'],
    (i) => `        ${key}: ${stored(i === 0 ? 'body' : 'merged')},\n`,
    `        ${key}: `,
  )
  await insertBefore(
    DETAIL,
    ['              <div>\n                <dt className="text-xs text-muted-foreground">Status</dt>'],
    () => `              <div>
                <dt className="text-xs text-muted-foreground">${title}</dt>
                <dd className="mt-0.5 text-sm">{author.${key} ?? '—'}</dd>
              </div>
`,
    `{author.${key} ?? `,
  )
}
