import * as ts from '@pbuilder/sdk/typescript'
import { astLibrary } from '@pbuilder/sdk/typescript'
import type { Input } from './schema.generated.ts'

const { SyntaxKind } = astLibrary
const pascal = (kebab: string) => kebab.split('-').map((part) => part[0].toUpperCase() + part.slice(1)).join('')
const camel = (kebab: string) => pascal(kebab).replace(/^./, (first) => first.toLowerCase())

export default async ({ singular, plural }: Input) => {
  const handlers = `${camel(singular)}Handlers`
  const reset = `reset${pascal(plural)}`
  const from = `./domains/${plural}.mock`

  await ts
    .find('mocks/handlers.ts')
    .addImport(handlers, from, { position: 'sorted' })
    .modify((ast) => {
      const list = ast
        .getFunctionOrThrow('createHandlers')
        .getFirstDescendantByKindOrThrow(SyntaxKind.ReturnStatement)
        .getFirstDescendantByKindOrThrow(SyntaxKind.ArrayLiteralExpression)
      const spread = `...${handlers}(config, base)`
      if (!list.getElements().some((element) => element.getText() === spread)) list.addElement(spread)
    })

  await ts
    .find('mocks/setup-test-mocking.ts')
    .addImport(reset, from, { position: 'sorted' })
    .modify((ast) => {
      const afterEach = ast
        .getDescendantsOfKind(SyntaxKind.CallExpression)
        .find((call) => call.getExpression().getText() === 'afterEach')
      const body = afterEach?.getArguments()[0]?.asKind(SyntaxKind.ArrowFunction)?.getBody().asKind(SyntaxKind.Block)
      if (!body) throw new Error('mocks/setup-test-mocking.ts: afterEach(() => { … }) not found')
      const call = `${reset}()`
      if (!body.getStatements().some((statement) => statement.getText() === call)) body.addStatements(call)
    })
}
