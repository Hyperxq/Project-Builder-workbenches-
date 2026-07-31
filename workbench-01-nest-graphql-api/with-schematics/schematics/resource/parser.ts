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

const stripComments = (source: string): string =>
  source.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/[^\n]*/g, '');

const parseSchemaImports = (source: string): Record<string, string> => {
  const imports: Record<string, string> = {};
  const importRe = /import\s*\{([^}]+)\}\s*from\s*'([^']+)'/g;
  let match: RegExpExecArray | null;

  while ((match = importRe.exec(source)) !== null) {
    match[1]
      .split(',')
      .map((id) => id.trim())
      .filter((id) => /Schema$/.test(id))
      .forEach((id) => {
        imports[id] = match![2];
      });
  }

  return imports;
};

export const parseMongooseSchema = (rawSource: string): ParsedSchema => {
  const source = stripComments(rawSource);

  const classMatch = source.match(
    /export const (\w+)Schema\s*=\s*new mongoose\.Schema/,
  );
  if (!classMatch) {
    throw new Error(
      'Could not find `export const <Name>Schema = new mongoose.Schema(...)` in the schema file.',
    );
  }

  const addMatch = source.match(/\.add\(\{([\s\S]*?)\n\}\);/);
  if (!addMatch) {
    throw new Error(
      'Could not find a `<Name>Schema.add({ ... });` block in the schema file.',
    );
  }

  const schemaImports = parseSchemaImports(source);
  const fields: ParsedField[] = [];
  const fieldRe = /(\w+)\s*:\s*\{([^}]*)\}/g;
  let entry: RegExpExecArray | null;

  while ((entry = fieldRe.exec(addMatch[1])) !== null) {
    const [, name, options] = entry;

    const typeMatch = options.match(/type\s*:\s*([\w.]+)/);
    if (!typeMatch) {
      throw new Error(`Field "${name}": missing type.`);
    }

    const base = {
      name,
      required: /required\s*:\s*true/.test(options),
      unique: /unique\s*:\s*true/.test(options),
      hasDefault: /default\s*:/.test(options),
    };

    if ((PRIMITIVE_TYPES as readonly string[]).includes(typeMatch[1])) {
      fields.push({ ...base, type: typeMatch[1] as MongooseFieldType });
      continue;
    }

    const subMatch = typeMatch[1].match(/^(\w+)Schema$/);
    if (subMatch && schemaImports[typeMatch[1]] !== undefined) {
      fields.push({ ...base, type: 'SubSchema', subSchemaClass: subMatch[1] });
      continue;
    }

    throw new Error(
      `Field "${name}": unsupported type "${typeMatch[1]}". Supported: ${PRIMITIVE_TYPES.join(', ')}, or an imported <Name>Schema for embedded sub-documents.`,
    );
  }

  if (fields.length === 0) {
    throw new Error(
      'The schema has no fields yet — fill the `.add({ ... })` block before generating the resource.',
    );
  }

  return { className: classMatch[1], fields, schemaImports };
};
