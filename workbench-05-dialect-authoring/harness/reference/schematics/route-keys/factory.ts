import * as ts from '@pbuilder/sdk/typescript'
import { astLibrary } from '@pbuilder/sdk/typescript'
import type { Input } from './schema.generated.ts'

const { SyntaxKind } = astLibrary
const upper = (kebab: string) => kebab.replaceAll('-', '_').toUpperCase()

export default async ({ singular, plural }: Input) => {
  const keys = [`LIST_${upper(plural)}`, ...['GET', 'CREATE', 'UPDATE', 'DELETE'].map((verb) => `${verb}_${upper(singular)}`)]
  await ts.find('mocks/core/types.ts').modify((ast) => {
    const union = ast.getTypeAliasOrThrow('MockRouteKey').getTypeNodeOrThrow().asKindOrThrow(SyntaxKind.UnionType)
    const present = new Set(union.getTypeNodes().map((member) => member.getText()))
    const missing = keys.map((key) => `'${key}'`).filter((key) => !present.has(key))
    if (missing.length === 0) return
    ast.insertText(union.getEnd(), missing.map((key) => `\n  | ${key}`).join(''))
  })
}
