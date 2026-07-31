import type { ParsedField } from './parser.ts';
import type { ResourceNames } from '../shared/names.ts';
import { keyFields, type SubSchemas } from './templates.ts';

type Variant = 1 | 2;
type Json = string | number | boolean | { [key: string]: Json };

const isSub = (f: ParsedField): boolean => f.type === 'SubSchema';

const subFieldsOf = (f: ParsedField, subs: SubSchemas): ParsedField[] => {
  const fields = subs.get(f.subSchemaClass!);
  if (!fields) {
    throw new Error(`Sub-schema ${f.subSchemaClass!} was not loaded.`);
  }
  return fields;
};

const primitiveValue = (
  f: ParsedField,
  variant: Variant,
): string | number | boolean => {
  switch (f.type) {
    case 'Number':
      return variant;
    case 'Boolean':
      return variant === 1;
    case 'Date':
      return variant === 1
        ? '2024-01-01T00:00:00.000Z'
        : '2024-02-01T00:00:00.000Z';
    default:
      return /email/i.test(f.name)
        ? `user${variant}@example.com`
        : `${f.name}-${variant}`;
  }
};

export const createFields = (fields: ParsedField[]): ParsedField[] =>
  fields.filter((f) => !f.hasDefault);

const jsonValue = (
  f: ParsedField,
  variant: Variant,
  subs: SubSchemas,
  pick: (fields: ParsedField[]) => ParsedField[],
): Json => {
  if (!isSub(f)) return primitiveValue(f, variant);
  return Object.fromEntries(
    pick(subFieldsOf(f, subs)).map((sf) => [
      sf.name,
      jsonValue(sf, variant, subs, pick),
    ]),
  );
};

// TS source literal for the same sample (Date fields become Date instances).
const tsLiteral = (
  f: ParsedField,
  variant: Variant,
  subs: SubSchemas,
  indent: string,
): string => {
  if (f.type === 'Date') {
    return `new Date('${String(primitiveValue(f, variant))}')`;
  }
  if (isSub(f)) {
    return tsObject(subFieldsOf(f, subs), variant, subs, `${indent}  `);
  }
  return JSON.stringify(primitiveValue(f, variant));
};

const tsObject = (
  fields: ParsedField[],
  variant: Variant,
  subs: SubSchemas,
  indent = '  ',
): string =>
  `{\n${fields
    .map((f) => `${indent}  ${f.name}: ${tsLiteral(f, variant, subs, indent)},`)
    .join('\n')}\n${indent}}`;

const jsonObject = (
  fields: ParsedField[],
  variant: Variant,
  subs: SubSchemas,
  pick: (fields: ParsedField[]) => ParsedField[],
): string =>
  JSON.stringify(
    Object.fromEntries(
      fields.map((f) => [f.name, jsonValue(f, variant, subs, pick)]),
    ),
    null,
    2,
  );

const selectionOf = (
  fields: ParsedField[],
  subs: SubSchemas,
  pick: (fields: ParsedField[]) => ParsedField[],
): string =>
  fields
    .map((f) =>
      isSub(f)
        ? `${f.name} { ${selectionOf(pick(subFieldsOf(f, subs)), subs, pick)} }`
        : f.name,
    )
    .join(' ');

export const updateField = (fields: ParsedField[]): ParsedField => {
  const key = keyFields(fields)[0];
  return (
    fields.find((f) => f.name !== key.name && !isSub(f)) ?? key
  );
};

export const serviceSpecTemplate = (
  n: ResourceNames,
  fields: ParsedField[],
  subs: SubSchemas,
): string => {
  const key = keyFields(fields)[0];
  const upd = updateField(fields);

  return `import { Test, TestingModule } from '@nestjs/testing';
import { ${n.singularClass}Service } from './${n.singularDashed}.service';
import { ${n.singularClass}Repository } from './${n.singularDashed}.repository';
import { ${n.singularClass} } from './entities/${n.singularDashed}.entity';

describe('${n.singularClass}Service', () => {
  let service: ${n.singularClass}Service;

  const repo = {
    create: jest.fn(),
    findMany: jest.fn(),
    findOne: jest.fn(),
    update: jest.fn(),
    remove: jest.fn(),
  };

  const sample: ${n.singularClass} = ${tsObject(fields, 1, subs)};

  const keyQuery = { ${key.name}: ${tsLiteral(key, 1, subs, '  ')} };

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ${n.singularClass}Service,
        { provide: ${n.singularClass}Repository, useValue: repo },
      ],
    }).compile();

    service = module.get(${n.singularClass}Service);
  });

  it('create delegates to the repository', async () => {
    repo.create.mockResolvedValue(sample);

    await expect(service.create(sample)).resolves.toEqual(sample);
    expect(repo.create).toHaveBeenCalledWith(sample);
  });

  it('findAll delegates to the repository', async () => {
    repo.findMany.mockResolvedValue([sample]);

    await expect(service.findAll()).resolves.toEqual([sample]);
    expect(repo.findMany).toHaveBeenCalledWith({});
  });

  it('findOne delegates to the repository', async () => {
    repo.findOne.mockResolvedValue(sample);

    await expect(service.findOne(keyQuery)).resolves.toEqual(sample);
    expect(repo.findOne).toHaveBeenCalledWith(keyQuery);
  });

  it('update delegates to the repository without upsert', async () => {
    repo.update.mockResolvedValue(sample);
    const payload = { ${upd.name}: ${tsLiteral(upd, 2, subs, '  ')} };

    await expect(
      service.update({ query: keyQuery, payload }),
    ).resolves.toEqual(sample);
    expect(repo.update).toHaveBeenCalledWith(keyQuery, payload, {
      upsert: false,
    });
  });

  it('remove delegates to the repository', async () => {
    repo.remove.mockResolvedValue(sample);

    await expect(service.remove(keyQuery)).resolves.toEqual(sample);
    expect(repo.remove).toHaveBeenCalledWith(keyQuery);
  });
});
`;
};

export const e2eSpecTemplate = (
  n: ResourceNames,
  fields: ParsedField[],
  subs: SubSchemas,
): string => {
  const creatable = createFields(fields);
  const key = keyFields(fields)[0];
  const upd = updateField(fields);
  const selection = selectionOf(creatable, subs, createFields);

  return `import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { App } from 'supertest/types';
import { Connection } from 'mongoose';
import { getConnectionToken } from '@nestjs/mongoose';
import { AppModule } from './../src/app.module';

interface GqlResponse {
  data?: Record<string, any>;
  errors?: Array<{ message: string }>;
}

// Requires MongoDB running (docker compose up -d mongodb) — AppModule boots
// the real database connection.
describe('${n.pluralClass} (e2e)', () => {
  let app: INestApplication<App>;
  let connection: Connection;

  const create${n.singularClass} = ${jsonObject(creatable, 1, subs, createFields).split('\n').join('\n  ')};

  const gql = async (
    query: string,
    variables?: Record<string, unknown>,
  ): Promise<GqlResponse> => {
    const res = await request(app.getHttpServer())
      .post('/graphql')
      .send({ query, variables })
      .expect(200);
    return res.body as GqlResponse;
  };

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    // Mirror the global pipe from main.ts — whitelist behavior is part of the
    // contract under test.
    app.useGlobalPipes(
      new ValidationPipe({ whitelist: true, transform: true }),
    );
    await app.init();

    connection = app.get<Connection>(getConnectionToken());
    await connection.collection('${n.pluralCamel}').deleteMany({});
  });

  afterAll(async () => {
    await connection.collection('${n.pluralCamel}').deleteMany({});
    await app.close();
  });

  it('create${n.singularClass} persists and returns the ${n.singularCamel}', async () => {
    const body = await gql(
      \`mutation($input: Create${n.singularClass}Input!) {
        create${n.singularClass}(create${n.singularClass}: $input) { ${selection} }
      }\`,
      { input: create${n.singularClass} },
    );

    expect(body.errors).toBeUndefined();
    expect(body.data?.create${n.singularClass}).toEqual(create${n.singularClass});
  });

  it('${n.pluralCamel} lists the created ${n.singularCamel}', async () => {
    const body = await gql(\`{ ${n.pluralCamel} { ${key.name} } }\`);

    expect(body.errors).toBeUndefined();
    expect(body.data?.${n.pluralCamel}).toEqual([
      { ${key.name}: create${n.singularClass}.${key.name} },
    ]);
  });

  it('${n.singularCamel} finds by ${key.name}', async () => {
    const body = await gql(
      \`query($get: Get${n.singularClass}Input!) {
        ${n.singularCamel}(get${n.singularClass}: $get) { ${key.name} }
      }\`,
      { get: { ${key.name}: create${n.singularClass}.${key.name} } },
    );

    expect(body.errors).toBeUndefined();
    expect(body.data?.${n.singularCamel}).toEqual({
      ${key.name}: create${n.singularClass}.${key.name},
    });
  });

  it('update${n.singularClass} applies and persists the change', async () => {
    const newValue = ${JSON.stringify(primitiveValue(updateField(fields), 2))};

    const updated = await gql(
      \`mutation($args: Update${n.singularClass}Args!) {
        update${n.singularClass}(update${n.singularClass}Args: $args) { ${key.name} ${upd.name} }
      }\`,
      {
        args: {
          query: { ${key.name}: create${n.singularClass}.${key.name} },
          payload: { ${upd.name}: newValue },
        },
      },
    );

    expect(updated.errors).toBeUndefined();
    expect(updated.data?.update${n.singularClass}).toEqual({
      ${key.name}: create${n.singularClass}.${key.name},
      ${upd.name}: newValue,
    });

    const persisted = await gql(
      \`query($get: Get${n.singularClass}Input!) {
        ${n.singularCamel}(get${n.singularClass}: $get) { ${upd.name} }
      }\`,
      { get: { ${key.name}: create${n.singularClass}.${key.name} } },
    );

    expect(persisted.data?.${n.singularCamel}).toEqual({ ${upd.name}: newValue });
  });

  it('remove${n.singularClass} deletes the ${n.singularCamel}', async () => {
    const removed = await gql(
      \`mutation($get: Get${n.singularClass}Input!) {
        remove${n.singularClass}(get${n.singularClass}: $get) { ${key.name} }
      }\`,
      { get: { ${key.name}: create${n.singularClass}.${key.name} } },
    );

    expect(removed.errors).toBeUndefined();
    expect(removed.data?.remove${n.singularClass}).toEqual({
      ${key.name}: create${n.singularClass}.${key.name},
    });

    const list = await gql(\`{ ${n.pluralCamel} { ${key.name} } }\`);
    expect(list.data?.${n.pluralCamel}).toEqual([]);
  });
});
`;
};

const bruFile = (
  name: string,
  seq: number,
  body: string,
  vars?: string,
): string => {
  const varsBlock =
    vars === undefined
      ? ''
      : `

body:graphql:vars {
  ${vars.split('\n').join('\n  ')}
}`;

  return `meta {
  name: ${name}
  type: graphql
  seq: ${seq}
}

post {
  url: {{baseUrl}}/graphql
  body: graphql
  auth: none
}

body:graphql {
  ${body.split('\n').join('\n  ')}
}${varsBlock}
`;
};

export const brunoTemplates = (
  n: ResourceNames,
  fields: ParsedField[],
  subs: SubSchemas,
): Record<string, string> => {
  const creatable = createFields(fields);
  const key = keyFields(fields)[0];
  const upd = updateField(fields);
  const all = (f: ParsedField[]): ParsedField[] => f;
  const selection = selectionOf(fields, subs, all).split(' ').join('\n  ');
  const keyVars = JSON.stringify(
    { [`get${n.singularClass}`]: { [key.name]: primitiveValue(key, 1) } },
    null,
    2,
  );

  return {
    [`create-${n.singularDashed}.bru`]: bruFile(
      `Create ${n.singularClass}`,
      1,
      `mutation Create${n.singularClass}($create${n.singularClass}: Create${n.singularClass}Input!) {
  create${n.singularClass}(create${n.singularClass}: $create${n.singularClass}) {
    ${selection}
  }
}`,
      JSON.stringify(
        {
          [`create${n.singularClass}`]: Object.fromEntries(
            creatable.map((f) => [f.name, jsonValue(f, 1, subs, createFields)]),
          ),
        },
        null,
        2,
      ),
    ),
    [`list-${n.pluralDashed}.bru`]: bruFile(
      `List ${n.pluralClass}`,
      2,
      `query ${n.pluralClass} {
  ${n.pluralCamel} {
    ${selection}
  }
}`,
    ),
    [`get-${n.singularDashed}.bru`]: bruFile(
      `Get ${n.singularClass}`,
      3,
      `query ${n.singularClass}($get${n.singularClass}: Get${n.singularClass}Input!) {
  ${n.singularCamel}(get${n.singularClass}: $get${n.singularClass}) {
    ${selection}
  }
}`,
      keyVars,
    ),
    [`update-${n.singularDashed}.bru`]: bruFile(
      `Update ${n.singularClass}`,
      4,
      `mutation Update${n.singularClass}($update${n.singularClass}Args: Update${n.singularClass}Args!) {
  update${n.singularClass}(update${n.singularClass}Args: $update${n.singularClass}Args) {
    ${selection}
  }
}`,
      JSON.stringify(
        {
          [`update${n.singularClass}Args`]: {
            query: { [key.name]: primitiveValue(key, 1) },
            payload: { [upd.name]: primitiveValue(upd, 2) },
          },
        },
        null,
        2,
      ),
    ),
    [`remove-${n.singularDashed}.bru`]: bruFile(
      `Remove ${n.singularClass}`,
      5,
      `mutation Remove${n.singularClass}($get${n.singularClass}: Get${n.singularClass}Input!) {
  remove${n.singularClass}(get${n.singularClass}: $get${n.singularClass}) {
    ${selection}
  }
}`,
      keyVars,
    ),
  };
};
