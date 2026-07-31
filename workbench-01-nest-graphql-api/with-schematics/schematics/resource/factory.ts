import { create, find, replaceContent } from '@pbuilder/sdk/commons';
import type { Input } from './schema.generated.ts';
import { camelize, classify, dasherize, resourceNames } from '../shared/names.ts';
import { parseMongooseSchema, type ParsedSchema } from './parser.ts';
import {
  createDtoTemplate,
  entityTemplate,
  getDtoTemplate,
  moduleTemplate,
  repositoryTemplate,
  resolverTemplate,
  serviceTemplate,
  subEntityTemplate,
  subInputTemplate,
  updateDtoTemplate,
  type SubSchemas,
} from './templates.ts';
import {
  brunoTemplates,
  e2eSpecTemplate,
  serviceSpecTemplate,
} from './test-templates.ts';

export default async (input: Input) => {
  const schemaPath = input.schema.replace(/^\.\//, '');
  const pathMatch = schemaPath.match(
    /^src\/([\w-]+)\/schemas\/([\w-]+)\.schema\.ts$/,
  );
  if (!pathMatch) {
    throw new Error(
      `Schema path must follow src/<plural>/schemas/<singular>.schema.ts — got: ${input.schema}`,
    );
  }

  const source = await find(schemaPath).read();
  if (source === undefined || source === '') {
    throw new Error(
      `Schema file not found or empty: ${schemaPath}. Generate it first: builder execute default:schema --name=${pathMatch[1]}`,
    );
  }

  const parsed = parseMongooseSchema(source);
  const schemasDir = schemaPath.replace(/\/[\w-]+\.schema\.ts$/, '');
  const subs = await loadSubSchemas(schemasDir, parsed, new Set([schemaPath]));

  // The folder is the plural, the filename the singular — both authoritative.
  const n = {
    ...resourceNames(pathMatch[2]),
    plural: camelize(pathMatch[1]),
    pluralClass: classify(pathMatch[1]),
    pluralDashed: dasherize(pathMatch[1]),
    pluralCamel: camelize(pathMatch[1]),
  };

  if (parsed.className !== n.singularClass) {
    throw new Error(
      `Schema exports ${parsed.className}Schema but the filename implies ${n.singularClass}Schema — rename one so they match.`,
    );
  }

  const base = `src/${n.pluralDashed}`;
  const files: Record<string, string> = {
    [`${base}/entities/${n.singularDashed}.entity.ts`]: entityTemplate(n, parsed.fields),
    [`${base}/dto/create-${n.singularDashed}.input.dto.ts`]: createDtoTemplate(n, parsed.fields),
    [`${base}/dto/get-${n.singularDashed}.input.dto.ts`]: getDtoTemplate(n, parsed.fields),
    [`${base}/dto/update-${n.singularDashed}.input.dto.ts`]: updateDtoTemplate(n, parsed.fields),
    [`${base}/${n.singularDashed}.repository.ts`]: repositoryTemplate(n),
    [`${base}/${n.singularDashed}.service.ts`]: serviceTemplate(n),
    [`${base}/${n.singularDashed}.resolver.ts`]: resolverTemplate(n),
    [`${base}/${n.pluralDashed}.module.ts`]: moduleTemplate(n),
    [`${base}/${n.singularDashed}.service.spec.ts`]: serviceSpecTemplate(n, parsed.fields, subs),
    [`test/${n.pluralDashed}.e2e-spec.ts`]: e2eSpecTemplate(n, parsed.fields, subs),
  };

  subs.forEach((subFields, subClass) => {
    const dashed = dasherize(subClass);
    files[`${base}/entities/${dashed}.entity.ts`] = subEntityTemplate(subClass, subFields);
    files[`${base}/dto/${dashed}.input.dto.ts`] = subInputTemplate(subClass, subFields);
  });

  Object.entries(brunoTemplates(n, parsed.fields, subs)).forEach(
    ([name, content]) => {
      files[`bruno/${n.pluralDashed}/${name}`] = content;
    },
  );

  Object.entries(files).forEach(([path, template]) => {
    // options must be a JSON-safe value — omitting it puts `undefined` in the
    // IR batch and the transport's round-trip fidelity check rejects it.
    create(path, { template, options: {} });
  });

  await registerInAppModule(n.pluralClass, n.pluralDashed);
};

// Depth-first load of every embedded sub-schema; `visited` carries the import
// chain so a circular reference fails loud instead of hanging the generator.
const loadSubSchemas = async (
  schemasDir: string,
  parsed: ParsedSchema,
  visited: Set<string>,
  collected: SubSchemas = new Map(),
): Promise<SubSchemas> => {
  for (const field of parsed.fields.filter((f) => f.type === 'SubSchema')) {
    const subClass = field.subSchemaClass!;
    if (collected.has(subClass)) continue;

    const spec = parsed.schemaImports[`${subClass}Schema`];
    if (spec === undefined) {
      throw new Error(
        `Field "${field.name}" uses ${subClass}Schema but the schema file does not import it.`,
      );
    }

    const subPath = `${schemasDir}/${spec.replace(/^\.\//, '')}.ts`;
    if (visited.has(subPath)) {
      throw new Error(
        `Circular sub-schema reference detected at ${subPath} — embedded schemas cannot form a cycle.`,
      );
    }

    const subSource = await find(subPath).read();
    if (subSource === undefined || subSource === '') {
      throw new Error(
        `Sub-schema file not found: ${subPath} (imported as ${spec}). Sub-schemas must live next to the parent schema.`,
      );
    }

    const subParsed = parseMongooseSchema(subSource);
    if (subParsed.className !== subClass) {
      throw new Error(
        `${subPath} exports ${subParsed.className}Schema but the parent imports ${subClass}Schema.`,
      );
    }

    collected.set(subClass, subParsed.fields);
    await loadSubSchemas(
      schemasDir,
      subParsed,
      new Set([...visited, subPath]),
      collected,
    );
  }

  return collected;
};

const registerInAppModule = async (
  moduleClass: string,
  moduleDir: string,
): Promise<void> => {
  const appModulePath = 'src/app.module.ts';
  const source = await find(appModulePath).read();
  if (source === undefined || source === '') {
    throw new Error(`${appModulePath} not found — is this a NestJS project root?`);
  }

  const moduleName = `${moduleClass}Module`;
  if (source.includes(moduleName)) return;

  const importLine = `import { ${moduleName} } from './${moduleDir}/${moduleDir}.module';`;
  const lastImport = source.match(/import [^\n]+;(?![\s\S]*import [^\n]+;)/);
  if (!lastImport || lastImport.index === undefined) {
    throw new Error(`Could not find import statements in ${appModulePath}.`);
  }

  const withImport =
    source.slice(0, lastImport.index + lastImport[0].length) +
    `\n${importLine}` +
    source.slice(lastImport.index + lastImport[0].length);

  const importsClose = withImport.match(/\n(\s*)\],\n\s*(providers|controllers)/);
  if (!importsClose || importsClose.index === undefined) {
    throw new Error(
      `Could not locate the imports array closing in ${appModulePath} — register ${moduleName} manually.`,
    );
  }

  const registered =
    withImport.slice(0, importsClose.index) +
    `\n${importsClose[1]}  ${moduleName},` +
    withImport.slice(importsClose.index);

  replaceContent(appModulePath, registered);
};
