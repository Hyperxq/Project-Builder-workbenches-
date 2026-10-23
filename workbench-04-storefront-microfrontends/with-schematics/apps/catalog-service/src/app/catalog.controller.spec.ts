import { Test } from '@nestjs/testing';
import { CATALOG_PATTERNS } from '@storefront/catalog-contract';
import { CatalogController } from './catalog.controller';
import { CatalogService } from './catalog.service';
import { PRODUCTS } from './products';

describe('CatalogController', () => {
  let controller: CatalogController;

  beforeEach(async () => {
    const moduleRef = await Test.createTestingModule({
      controllers: [CatalogController],
      providers: [CatalogService],
    }).compile();
    controller = moduleRef.get(CatalogController);
  });

  it('lists every seeded product', () => {
    expect(controller.list()).toEqual(PRODUCTS);
  });

  it('returns a product by id', () => {
    expect(controller.get({ id: 'canvas-tote' })).toMatchObject({
      id: 'canvas-tote',
      name: 'Canvas Tote',
    });
  });

  it('returns null for an unknown id', () => {
    expect(controller.get({ id: 'nope' })).toBeNull();
  });

  it('uses the shared message patterns', () => {
    expect(
      Reflect.getMetadata('microservices:pattern', controller.list),
    ).toEqual([CATALOG_PATTERNS.list]);
    expect(
      Reflect.getMetadata('microservices:pattern', controller.get),
    ).toEqual([CATALOG_PATTERNS.get]);
  });
});
