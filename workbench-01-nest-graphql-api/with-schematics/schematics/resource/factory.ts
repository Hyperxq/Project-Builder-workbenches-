import { create, find } from '@pbuilder/sdk/commons';
import * as tsd from '@pbuilder/sdk/typescript';
import { Node, type SourceFile } from 'ts-morph';
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
  // Skip BEFORE scheduling the edit — an already-registered module must leave
  // app.module.ts out of the batch entirely, not rewrite it byte-identical.
  if (source.includes(moduleName)) return;

  await tsd.find(appModulePath).modify((sf) => {
    // The dialect pins double-quote style; this repo is single-quote — set the
    // specifier text explicitly so generated code matches the file around it.
    sf.addImportDeclaration({
      namedImports: [moduleName],
      moduleSpecifier: `./${moduleDir}/${moduleDir}.module`,
    })
      .getModuleSpecifier()
      .replaceWithText(`'./${moduleDir}/${moduleDir}.module'`);

    const importsArray = findModuleImportsArray(sf);
    if (!importsArray) {
      throw new Error(
        `Could not locate the @Module imports array in ${appModulePath} — register ${moduleName} manually.`,
      );
    }
    importsArray.addElement(moduleName);
  });
};

const findModuleImportsArray = (sf: SourceFile) => {
  for (const cls of sf.getClasses()) {
    const arg = cls.getDecorator('Module')?.getArguments()[0];
    if (!Node.isObjectLiteralExpression(arg)) continue;

    const importsProp = arg.getProperty('imports');
    if (!Node.isPropertyAssignment(importsProp)) continue;

    const init = importsProp.getInitializer();
    if (Node.isArrayLiteralExpression(init)) return init;
  }
  return undefined;
};
