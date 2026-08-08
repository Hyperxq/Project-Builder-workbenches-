import {
  Node,
  Project,
  SyntaxKind,
  type Expression,
  type ObjectLiteralExpression,
  type SourceFile,
} from 'ts-morph';

export type MongooseFieldType =
  | 'String'
  | 'Number'
  | 'Boolean'
  | 'Date'
  | 'SubSchema';

export interface ParsedField {
  name: string;
  type: MongooseFieldType;
  /** Set when type === 'SubSchema' — the embedded class name, e.g. 'Calibrated'. */
  subSchemaClass?: string;
  required: boolean;
  unique: boolean;
  hasDefault: boolean;
}

export interface ParsedSchema {
  className: string;
  fields: ParsedField[];
  /** Named schema imports: 'CalibratedSchema' → './calibrated.schema'. */
  schemaImports: Record<string, string>;
}

const PRIMITIVE_TYPES = ['String', 'Number', 'Boolean', 'Date'] as const;

const parseSourceFile = (source: string): SourceFile =>
  new Project({ useInMemoryFileSystem: true }).createSourceFile(
    'schema.ts',
    source,
  );

const findSchemaDeclaration = (sf: SourceFile) =>
  sf.getVariableDeclarations().find((decl) => {
    if (!decl.getName().endsWith('Schema')) return false;
    if (decl.getVariableStatement()?.isExported() !== true) return false;
    const init = decl.getInitializer();
    return (
      Node.isNewExpression(init) &&
      init.getExpression().getText() === 'mongoose.Schema'
    );
  });

const findAddedFieldsLiteral = (
  sf: SourceFile,
  schemaVariable: string,
): ObjectLiteralExpression | undefined => {
  for (const call of sf.getDescendantsOfKind(SyntaxKind.CallExpression)) {
    const callee = call.getExpression();
    if (!Node.isPropertyAccessExpression(callee)) continue;
    if (callee.getName() !== 'add') continue;
    if (callee.getExpression().getText() !== schemaVariable) continue;

    const arg = call.getArguments()[0];
    if (Node.isObjectLiteralExpression(arg)) return arg;
  }
  return undefined;
};

const collectSchemaImports = (sf: SourceFile): Record<string, string> => {
  const imports: Record<string, string> = {};
  for (const decl of sf.getImportDeclarations()) {
    for (const named of decl.getNamedImports()) {
      if (named.getName().endsWith('Schema')) {
        imports[named.getName()] = decl.getModuleSpecifierValue();
      }
    }
  }
  return imports;
};

const isTrue = (expr: Expression | undefined): boolean =>
  expr?.getKind() === SyntaxKind.TrueKeyword;

export const parseMongooseSchema = (rawSource: string): ParsedSchema => {
  const sf = parseSourceFile(rawSource);

  const schemaDecl = findSchemaDeclaration(sf);
  if (!schemaDecl) {
    throw new Error(
      'Could not find `export const <Name>Schema = new mongoose.Schema(...)` in the schema file.',
    );
  }
  const schemaVariable = schemaDecl.getName();
  const className = schemaVariable.slice(0, -'Schema'.length);

  const fieldsLiteral = findAddedFieldsLiteral(sf, schemaVariable);
  if (!fieldsLiteral) {
    throw new Error(
      'Could not find a `<Name>Schema.add({ ... });` block in the schema file.',
    );
  }

  const schemaImports = collectSchemaImports(sf);
  const fields: ParsedField[] = [];

  for (const prop of fieldsLiteral.getProperties()) {
    if (!Node.isPropertyAssignment(prop)) continue;
    const name = prop.getName();

    const options = prop.getInitializer();
    if (!Node.isObjectLiteralExpression(options)) {
      throw new Error(`Field "${name}": missing type.`);
    }

    const option = (key: string): Expression | undefined => {
      const entry = options.getProperty(key);
      return Node.isPropertyAssignment(entry)
        ? entry.getInitializer()
        : undefined;
    };

    const typeExpr = option('type');
    if (!typeExpr) {
      throw new Error(`Field "${name}": missing type.`);
    }
    const typeName = typeExpr.getText();

    const base = {
      name,
      required: isTrue(option('required')),
      unique: isTrue(option('unique')),
      hasDefault: option('default') !== undefined,
    };

    if ((PRIMITIVE_TYPES as readonly string[]).includes(typeName)) {
      fields.push({ ...base, type: typeName as MongooseFieldType });
      continue;
    }

    if (typeName.endsWith('Schema') && schemaImports[typeName] !== undefined) {
      fields.push({
        ...base,
        type: 'SubSchema',
        subSchemaClass: typeName.slice(0, -'Schema'.length),
      });
      continue;
    }

    throw new Error(
      `Field "${name}": unsupported type "${typeName}". Supported: ${PRIMITIVE_TYPES.join(', ')}, or an imported <Name>Schema for embedded sub-documents.`,
    );
  }

  if (fields.length === 0) {
    throw new Error(
      'The schema has no fields yet — fill the `.add({ ... })` block before generating the resource.',
    );
  }

  return { className, fields, schemaImports };
};
