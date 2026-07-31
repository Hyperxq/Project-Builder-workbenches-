import { describe, expect, test } from 'bun:test';
import { runFactoryForTest } from '@pbuilder/sdk/testing';
import factory from './factory.ts';
import { parseMongooseSchema } from './parser.ts';

const productSchema = `import * as mongoose from 'mongoose';

export const ProductSchema = new mongoose.Schema({}, { versionKey: false });

ProductSchema.add({
  sku: { type: String, required: true, unique: true },
  title: { type: String, required: true },
  price: { type: Number, required: true },
  inStock: { type: Boolean, required: true, default: true },
});
`;

const appModule = `import { Module } from '@nestjs/common';
import { DatabaseModule } from '@app/common';
import { AppResolver } from './app.resolver';

@Module({
  imports: [
    DatabaseModule,
  ],
  providers: [AppResolver],
})
export class AppModule {}
`;

const seed = {
  'src/products/schemas/product.schema.ts': productSchema,
  'src/app.module.ts': appModule,
};

const run = () =>
  runFactoryForTest(
    factory,
    { schema: 'src/products/schemas/product.schema.ts' },
    { seed },
  );

describe('parser', () => {
  test('parses fields with flags and ignores comments', () => {
    const parsed = parseMongooseSchema(productSchema);

    expect(parsed.className).toBe('Product');
    expect(parsed.fields).toEqual([
      { name: 'sku', type: 'String', required: true, unique: true, hasDefault: false },
      { name: 'title', type: 'String', required: true, unique: false, hasDefault: false },
      { name: 'price', type: 'Number', required: true, unique: false, hasDefault: false },
      { name: 'inStock', type: 'Boolean', required: true, unique: false, hasDefault: true },
    ]);
  });

  test('rejects a schema whose add block only has commented examples', () => {
    const skeleton = productSchema.replace(/\n {2}\w+.*$/gm, '\n  // example: { type: String },');
    expect(() => parseMongooseSchema(skeleton)).toThrow(/no fields/);
  });
});

describe('resource factory', () => {
  test('generates the full resource tree', async () => {
    const result = await run();

    expect(result.error).toBeUndefined();
    const paths = [...result.tree.keys()].sort();
    expect(paths).toEqual([
      'bruno/products/create-product.bru',
      'bruno/products/get-product.bru',
      'bruno/products/list-products.bru',
      'bruno/products/remove-product.bru',
      'bruno/products/update-product.bru',
      'src/app.module.ts',
      'src/products/dto/create-product.input.dto.ts',
      'src/products/dto/get-product.input.dto.ts',
      'src/products/dto/update-product.input.dto.ts',
      'src/products/entities/product.entity.ts',
      'src/products/product.repository.ts',
      'src/products/product.resolver.ts',
      'src/products/product.service.spec.ts',
      'src/products/product.service.ts',
      'src/products/products.module.ts',
      'test/products.e2e-spec.ts',
    ]);
  });

  test('bakes the proven fixes into the generated code', async () => {
    const result = await run();

    const resolver = result.tree.get('src/products/product.resolver.ts');
    expect(resolver).toContain("import { TryAndCatch } from '@app/common';");
    expect(resolver).toContain('@TryAndCatch()');

    const updateDto = result.tree.get('src/products/dto/update-product.input.dto.ts');
    expect(updateDto).toContain('@ValidateNested()');
    expect(updateDto).toContain('@Type(() => GetProductInput)');

    const service = result.tree.get('src/products/product.service.ts');
    expect(service).toContain('Promise<Product | null>');
    expect(service).toContain('this.repo.update<UpdateProductPayload, Product>');
  });

  test('GetInput exposes only unique key fields', async () => {
    const result = await run();

    const getDto = result.tree.get('src/products/dto/get-product.input.dto.ts');
    expect(getDto).toContain('sku?: string;');
    expect(getDto).not.toContain('title');
    expect(getDto).not.toContain('price');
  });

  test('create DTO omits nothing but marks defaulted fields optional', async () => {
    const result = await run();

    const createDto = result.tree.get('src/products/dto/create-product.input.dto.ts');
    expect(createDto).toContain('sku: string;');
    expect(createDto).toContain('inStock?: boolean;');
  });

  test('registers the module in app.module.ts exactly once', async () => {
    const result = await run();

    const mutated = result.tree.get('src/app.module.ts');
    expect(mutated).toContain(
      "import { ProductsModule } from './products/products.module';",
    );
    expect(mutated).toContain('    ProductsModule,\n  ],');
  });

  test('is idempotent on app.module.ts when the module is already registered', async () => {
    const result = await runFactoryForTest(
      factory,
      { schema: 'src/products/schemas/product.schema.ts' },
      {
        seed: {
          ...seed,
          'src/app.module.ts': appModule.replace(
            '    DatabaseModule,',
            '    DatabaseModule,\n    ProductsModule,',
          ),
        },
      },
    );

    expect(result.error).toBeUndefined();
    // app.module.ts untouched → absent from the committed tree.
    expect(result.tree.has('src/app.module.ts')).toBe(false);
  });

  test('fails loud on a non-conventional schema path', async () => {
    const result = await runFactoryForTest(
      factory,
      { schema: 'src/whatever.ts' },
      { seed },
    );

    expect(result.error).toBeDefined();
    expect(String(result.error)).toContain('src/<plural>/schemas/<singular>.schema.ts');
  });

  test('e2e spec drives the CRUD flow through /graphql', async () => {
    const result = await run();

    const e2e = result.tree.get('test/products.e2e-spec.ts');
    expect(e2e).toContain("describe('Products (e2e)'");
    expect(e2e).toContain('createProduct');
    expect(e2e).toContain('updateProductArgs');
    expect(e2e).toContain("connection.collection('products').deleteMany({})");
    expect(e2e).toContain('ValidationPipe({ whitelist: true, transform: true })');
  });
});

describe('resource factory with embedded sub-schema', () => {
  const calibratedSchema = `import * as mongoose from 'mongoose';

export const CalibratedSchema = new mongoose.Schema({}, { versionKey: false });

CalibratedSchema.add({
  factor: { type: Number, required: true },
  verifiedAt: { type: Date, required: false },
});
`;

  const productWithSub = productSchema.replace(
    "import * as mongoose from 'mongoose';",
    "import * as mongoose from 'mongoose';\nimport { CalibratedSchema } from './calibrated.schema';",
  ).replace(
    'inStock: { type: Boolean, required: true, default: true },',
    `inStock: { type: Boolean, required: true, default: true },
  calibrated: { type: CalibratedSchema, required: true },`,
  );

  const subSeed = {
    'src/products/schemas/product.schema.ts': productWithSub,
    'src/products/schemas/calibrated.schema.ts': calibratedSchema,
    'src/app.module.ts': appModule,
  };

  const runSub = () =>
    runFactoryForTest(
      factory,
      { schema: 'src/products/schemas/product.schema.ts' },
      { seed: subSeed },
    );

  test('generates nested entity and input classes', async () => {
    const result = await runSub();

    expect(result.error).toBeUndefined();

    const subEntity = result.tree.get('src/products/entities/calibrated.entity.ts');
    expect(subEntity).toContain('export class Calibrated {');
    expect(subEntity).toContain('factor: number;');

    const subInput = result.tree.get('src/products/dto/calibrated.input.dto.ts');
    expect(subInput).toContain('export class CalibratedInput {');

    const entity = result.tree.get('src/products/entities/product.entity.ts');
    expect(entity).toContain("import { Calibrated } from './calibrated.entity';");
    expect(entity).toContain('@Type(() => Calibrated)');
    expect(entity).toContain('calibrated: Calibrated;');

    const createDto = result.tree.get('src/products/dto/create-product.input.dto.ts');
    expect(createDto).toContain("import { CalibratedInput } from './calibrated.input.dto';");
    expect(createDto).toContain('@ValidateNested()');
    expect(createDto).toContain('calibrated: CalibratedInput;');
  });

  test('e2e spec nests selection sets and sample values', async () => {
    const result = await runSub();

    const e2e = result.tree.get('test/products.e2e-spec.ts');
    expect(e2e).toContain('calibrated { factor verifiedAt }');
    expect(e2e).toContain('"factor": 1');
  });

  test('fails loud when the sub-schema file is missing', async () => {
    const result = await runFactoryForTest(
      factory,
      { schema: 'src/products/schemas/product.schema.ts' },
      { seed: { ...subSeed, 'src/products/schemas/calibrated.schema.ts': '' } },
    );

    expect(result.error).toBeDefined();
    expect(String(result.error)).toContain('Sub-schema file not found');
  });

  test('fails loud on a circular sub-schema reference', async () => {
    const circularCalibrated = calibratedSchema.replace(
      "import * as mongoose from 'mongoose';",
      "import * as mongoose from 'mongoose';\nimport { ProductSchema } from './product.schema';",
    ).replace(
      'factor: { type: Number, required: true },',
      `factor: { type: Number, required: true },
  product: { type: ProductSchema, required: false },`,
    );

    const result = await runFactoryForTest(
      factory,
      { schema: 'src/products/schemas/product.schema.ts' },
      {
        seed: {
          ...subSeed,
          'src/products/schemas/calibrated.schema.ts': circularCalibrated,
        },
      },
    );

    expect(result.error).toBeDefined();
    expect(String(result.error)).toContain('Circular sub-schema reference');
  });
});
