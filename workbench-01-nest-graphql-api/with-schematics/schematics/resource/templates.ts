import type { ParsedField } from './parser.ts';
import type { ResourceNames } from '../shared/names.ts';
import { dasherize } from '../shared/names.ts';

/** Embedded sub-schemas: class name ('Calibrated') → its parsed fields. */
export type SubSchemas = Map<string, ParsedField[]>;

type Mode = 'entity' | 'input';

const isSub = (f: ParsedField): boolean => f.type === 'SubSchema';

const gqlTypeName = (f: ParsedField, mode: Mode): string => {
  if (isSub(f)) {
    return mode === 'entity' ? f.subSchemaClass! : `${f.subSchemaClass!}Input`;
  }
  return { String: 'String', Number: 'Int', Boolean: 'Boolean', Date: 'Date' }[
    f.type as Exclude<ParsedField['type'], 'SubSchema'>
  ];
};

const tsTypeName = (f: ParsedField, mode: Mode): string => {
  if (isSub(f)) return gqlTypeName(f, mode);
  return { String: 'string', Number: 'number', Boolean: 'boolean', Date: 'Date' }[
    f.type as Exclude<ParsedField['type'], 'SubSchema'>
  ];
};

const validator = (f: ParsedField): string => {
  if (f.type === 'String' && /email/i.test(f.name)) return 'IsEmail';
  return { String: 'IsString', Number: 'IsInt', Boolean: 'IsBoolean', Date: 'IsDate' }[
    f.type as Exclude<ParsedField['type'], 'SubSchema'>
  ];
};

// A field is exposed as optional when creating: not required, or filled by a default.
export const optionalOnCreate = (f: ParsedField): boolean =>
  !f.required || f.hasDefault;
// A field is nullable on the entity when nothing guarantees a value.
export const nullableOnEntity = (f: ParsedField): boolean =>
  !f.required && !f.hasDefault;

export const keyFields = (fields: ParsedField[]): ParsedField[] => {
  const primitives = fields.filter((f) => !isSub(f));
  if (primitives.length === 0) {
    throw new Error(
      'The schema needs at least one primitive field to serve as a lookup key.',
    );
  }
  const uniques = primitives.filter((f) => f.unique);
  return uniques.length > 0 ? uniques : primitives;
};

const fieldBlock = (
  f: ParsedField,
  optional: boolean,
  mode: Mode,
): string => {
  const typeName = gqlTypeName(f, mode);
  const lines = [
    `  @Field(() => ${typeName}${optional ? ', { nullable: true }' : ''})`,
  ];
  if (optional) lines.push('  @IsOptional()');
  if (isSub(f)) {
    lines.push('  @ValidateNested()');
    lines.push(`  @Type(() => ${typeName})`);
  } else {
    lines.push(`  @${validator(f)}()`);
  }
  lines.push(`  ${f.name}${optional ? '?' : ''}: ${tsTypeName(f, mode)};`);
  return lines.join('\n');
};

interface ClassSpec {
  className: string;
  kind: 'ObjectType' | 'InputType';
  mode: Mode;
  fields: ParsedField[];
  optionalOf: (f: ParsedField) => boolean;
  extraValidators?: string[];
  extraImports?: string[];
}

const classImports = ({
  kind,
  mode,
  fields,
  optionalOf,
  extraValidators = [],
  extraImports = [],
}: Omit<ClassSpec, 'className'>): string => {
  const gqlNames = ['Field', kind];
  if (fields.some((f) => f.type === 'Number')) gqlNames.push('Int');

  const validatorNames = new Set<string>(
    fields.filter((f) => !isSub(f)).map(validator),
  );
  if (fields.some(optionalOf)) validatorNames.add('IsOptional');
  if (fields.some(isSub)) validatorNames.add('ValidateNested');
  extraValidators.forEach((name) => validatorNames.add(name));

  const lines = [
    `import { ${gqlNames.sort().join(', ')} } from '@nestjs/graphql';`,
    `import {\n${[...validatorNames]
      .sort()
      .map((name) => `  ${name},`)
      .join('\n')}\n} from 'class-validator';`,
  ];

  if (fields.some(isSub) || extraValidators.includes('ValidateNested')) {
    lines.push(`import { Type } from 'class-transformer';`);
  }

  fields.filter(isSub).forEach((f) => {
    const dashed = dasherize(f.subSchemaClass!);
    lines.push(
      mode === 'entity'
        ? `import { ${f.subSchemaClass!} } from './${dashed}.entity';`
        : `import { ${f.subSchemaClass!}Input } from './${dashed}.input.dto';`,
    );
  });

  return [...lines, ...extraImports].join('\n');
};

const classTemplate = (spec: ClassSpec): string => `${classImports(spec)}

@${spec.kind}()
export class ${spec.className} {
${spec.fields.map((f) => fieldBlock(f, spec.optionalOf(f), spec.mode)).join('\n\n')}
}
`;

export const entityTemplate = (n: ResourceNames, fields: ParsedField[]): string =>
  classTemplate({
    className: n.singularClass,
    kind: 'ObjectType',
    mode: 'entity',
    fields,
    optionalOf: nullableOnEntity,
  });

export const subEntityTemplate = (className: string, fields: ParsedField[]): string =>
  classTemplate({
    className,
    kind: 'ObjectType',
    mode: 'entity',
    fields,
    optionalOf: nullableOnEntity,
  });

export const createDtoTemplate = (n: ResourceNames, fields: ParsedField[]): string =>
  classTemplate({
    className: `Create${n.singularClass}Input`,
    kind: 'InputType',
    mode: 'input',
    fields,
    optionalOf: optionalOnCreate,
  });

export const subInputTemplate = (className: string, fields: ParsedField[]): string =>
  classTemplate({
    className: `${className}Input`,
    kind: 'InputType',
    mode: 'input',
    fields,
    optionalOf: optionalOnCreate,
  });

export const getDtoTemplate = (n: ResourceNames, fields: ParsedField[]): string =>
  classTemplate({
    className: `Get${n.singularClass}Input`,
    kind: 'InputType',
    mode: 'input',
    fields: keyFields(fields),
    optionalOf: () => true,
  });

export const updateDtoTemplate = (n: ResourceNames, fields: ParsedField[]): string => `${classTemplate(
  {
    className: `Update${n.singularClass}Payload`,
    kind: 'InputType',
    mode: 'input',
    fields,
    optionalOf: () => true,
    extraValidators: ['ValidateNested'],
    extraImports: [
      `import { Get${n.singularClass}Input } from './get-${n.singularDashed}.input.dto';`,
    ],
  },
).trimEnd()}

@InputType()
export class Update${n.singularClass}Args {
  @Field(() => Get${n.singularClass}Input)
  @ValidateNested()
  @Type(() => Get${n.singularClass}Input)
  query: Get${n.singularClass}Input;

  @Field(() => Update${n.singularClass}Payload)
  @ValidateNested()
  @Type(() => Update${n.singularClass}Payload)
  payload: Update${n.singularClass}Payload;
}
`;

export const repositoryTemplate = (n: ResourceNames): string => `import { Injectable } from '@nestjs/common';
import { InjectConnection, InjectModel } from '@nestjs/mongoose';
import { Connection, Model } from 'mongoose';
import { AbstractRepository } from '@app/common';
import { ${n.singularClass} } from './entities/${n.singularDashed}.entity';

@Injectable()
export class ${n.singularClass}Repository extends AbstractRepository<${n.singularClass}> {
  constructor(
    @InjectModel(${n.singularClass}.name) private readonly ${n.singularCamel}Model: Model<${n.singularClass}>,
    @InjectConnection() connection: Connection,
  ) {
    super(${n.singularCamel}Model, connection);
  }
}
`;

export const serviceTemplate = (n: ResourceNames): string => `import { Injectable } from '@nestjs/common';
import { ${n.singularClass}Repository } from './${n.singularDashed}.repository';
import { ${n.singularClass} } from './entities/${n.singularDashed}.entity';
import { Create${n.singularClass}Input } from './dto/create-${n.singularDashed}.input.dto';
import { Get${n.singularClass}Input } from './dto/get-${n.singularDashed}.input.dto';
import {
  Update${n.singularClass}Args,
  Update${n.singularClass}Payload,
} from './dto/update-${n.singularDashed}.input.dto';

@Injectable()
export class ${n.singularClass}Service {
  constructor(private readonly repo: ${n.singularClass}Repository) {}

  async create(create${n.singularClass}: Create${n.singularClass}Input): Promise<${n.singularClass}> {
    return await this.repo.create<Create${n.singularClass}Input, ${n.singularClass}>(
      create${n.singularClass},
    );
  }

  async findAll(): Promise<${n.singularClass}[]> {
    return await this.repo.findMany<${n.singularClass}>({});
  }

  async findOne(get${n.singularClass}: Get${n.singularClass}Input): Promise<${n.singularClass} | null> {
    return await this.repo.findOne<${n.singularClass}>(get${n.singularClass});
  }

  async update({
    query,
    payload,
  }: Update${n.singularClass}Args): Promise<${n.singularClass} | null> {
    return await this.repo.update<Update${n.singularClass}Payload, ${n.singularClass}>(
      query,
      payload,
      { upsert: false },
    );
  }

  async remove(remove${n.singularClass}: Get${n.singularClass}Input): Promise<${n.singularClass} | null> {
    return await this.repo.remove<${n.singularClass}>(remove${n.singularClass});
  }
}
`;

export const resolverTemplate = (n: ResourceNames): string => `import { Args, Mutation, Query, Resolver } from '@nestjs/graphql';
import { TryAndCatch } from '@app/common';
import { ${n.singularClass}Service } from './${n.singularDashed}.service';
import { ${n.singularClass} } from './entities/${n.singularDashed}.entity';
import { Create${n.singularClass}Input } from './dto/create-${n.singularDashed}.input.dto';
import { Get${n.singularClass}Input } from './dto/get-${n.singularDashed}.input.dto';
import { Update${n.singularClass}Args } from './dto/update-${n.singularDashed}.input.dto';

@Resolver(() => ${n.singularClass})
export class ${n.singularClass}Resolver {
  constructor(private readonly ${n.singularCamel}Service: ${n.singularClass}Service) {}

  @Mutation(() => ${n.singularClass}, { name: 'create${n.singularClass}' })
  @TryAndCatch()
  create(@Args('create${n.singularClass}') create${n.singularClass}: Create${n.singularClass}Input) {
    return this.${n.singularCamel}Service.create(create${n.singularClass});
  }

  @Query(() => [${n.singularClass}], {
    name: '${n.pluralCamel}',
    description: 'returns list of ${n.singularClass}',
  })
  @TryAndCatch()
  findAll() {
    return this.${n.singularCamel}Service.findAll();
  }

  @Query(() => ${n.singularClass}, {
    name: '${n.singularCamel}',
    description: 'gets ${n.singularClass} either by keys',
  })
  @TryAndCatch()
  findOne(
    @Args('get${n.singularClass}', { type: () => Get${n.singularClass}Input })
    get${n.singularClass}: Get${n.singularClass}Input,
  ) {
    return this.${n.singularCamel}Service.findOne(get${n.singularClass});
  }

  @Mutation(() => ${n.singularClass}, { name: 'update${n.singularClass}' })
  @TryAndCatch()
  update(@Args('update${n.singularClass}Args') update${n.singularClass}: Update${n.singularClass}Args) {
    return this.${n.singularCamel}Service.update(update${n.singularClass});
  }

  @Mutation(() => ${n.singularClass}, { name: 'remove${n.singularClass}' })
  @TryAndCatch()
  remove(
    @Args('get${n.singularClass}', { type: () => Get${n.singularClass}Input })
    get${n.singularClass}: Get${n.singularClass}Input,
  ) {
    return this.${n.singularCamel}Service.remove(get${n.singularClass});
  }
}
`;

export const moduleTemplate = (n: ResourceNames): string => `import { Module } from '@nestjs/common';
import { DatabaseModule } from '@app/common';
import { MongooseModule } from '@nestjs/mongoose';
import { ${n.singularClass}Resolver } from './${n.singularDashed}.resolver';
import { ${n.singularClass}Service } from './${n.singularDashed}.service';
import { ${n.singularClass} } from './entities/${n.singularDashed}.entity';
import { ${n.singularClass}Schema } from './schemas/${n.singularDashed}.schema';
import { ${n.singularClass}Repository } from './${n.singularDashed}.repository';

@Module({
  providers: [${n.singularClass}Resolver, ${n.singularClass}Service, ${n.singularClass}Repository],
  imports: [
    DatabaseModule,
    MongooseModule.forFeature([
      {
        name: ${n.singularClass}.name,
        schema: ${n.singularClass}Schema,
        collection: '${n.pluralCamel}',
      },
    ]),
  ],
})
export class ${n.pluralClass}Module {}
`;
