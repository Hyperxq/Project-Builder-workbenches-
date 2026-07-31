import { describe, expect, test } from 'bun:test';
import { pluralize, resourceNames, singularize } from './names.ts';

describe('singularize', () => {
  test.each([
    ['products', 'product'],
    ['categories', 'category'],
    ['boxes', 'box'],
    ['classes', 'class'],
    ['dishes', 'dish'],
    ['warehouses', 'warehouse'],
    ['databases', 'database'],
    ['responses', 'response'],
  ])('%s → %s', (plural, singular) => {
    expect(singularize(plural)).toBe(singular);
  });
});

describe('pluralize', () => {
  test.each([
    ['product', 'products'],
    ['category', 'categories'],
    ['box', 'boxes'],
    ['warehouse', 'warehouses'],
    ['warehouses', 'warehouses'],
  ])('%s → %s', (singular, plural) => {
    expect(pluralize(singular)).toBe(plural);
  });
});

describe('resourceNames', () => {
  test('derives all shapes from an -se plural', () => {
    expect(resourceNames('warehouses')).toEqual({
      singular: 'warehouse',
      plural: 'warehouses',
      singularClass: 'Warehouse',
      pluralClass: 'Warehouses',
      singularDashed: 'warehouse',
      pluralDashed: 'warehouses',
      singularCamel: 'warehouse',
      pluralCamel: 'warehouses',
    });
  });
});
