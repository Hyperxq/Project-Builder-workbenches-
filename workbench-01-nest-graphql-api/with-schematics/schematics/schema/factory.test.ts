import { describe, expect, test } from 'bun:test';
import { runFactoryForTest } from '@pbuilder/sdk/testing';
import factory from './factory.ts';

describe('schema factory', () => {
  test('creates the mongoose schema skeleton at the conventional path', async () => {
    const result = await runFactoryForTest(factory, { name: 'products' });

    expect(result.error).toBeUndefined();
    const content = result.tree.get('src/products/schemas/product.schema.ts');
    expect(content).toContain(
      'export const ProductSchema = new mongoose.Schema({}, { versionKey: false });',
    );
    expect(content).toContain('ProductSchema.add({');
    expect(content).toContain(
      '--schema=src/products/schemas/product.schema.ts',
    );
  });

  test('derives plural folder and singular filename from a singular name', async () => {
    const result = await runFactoryForTest(factory, { name: 'category' });

    expect(result.error).toBeUndefined();
    expect(
      result.tree.get('src/categories/schemas/category.schema.ts'),
    ).toContain('CategorySchema');
  });
});
