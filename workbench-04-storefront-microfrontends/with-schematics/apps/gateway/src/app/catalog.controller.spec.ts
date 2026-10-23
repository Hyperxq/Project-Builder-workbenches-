import { NotFoundException } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import {
  CATALOG_PATTERNS,
  CATALOG_SERVICE,
  type Product,
} from '@storefront/catalog-contract';
import { of } from 'rxjs';
import { CatalogController } from './catalog.controller';

const mug: Product = {
  id: 'mug',
  name: 'Mug',
  price: 1800,
  currency: 'USD',
  image: 'mug.png',
  description: 'A mug.',
};

describe('CatalogController (gateway)', () => {
  let controller: CatalogController;
  const send = jest.fn();

  beforeEach(async () => {
    send.mockReset();
    const moduleRef = await Test.createTestingModule({
      controllers: [CatalogController],
      providers: [{ provide: CATALOG_SERVICE, useValue: { send } }],
    }).compile();
    controller = moduleRef.get(CatalogController);
  });

  it('forwards the product list to the service', async () => {
    send.mockReturnValue(of([mug]));

    await expect(controller.list()).resolves.toEqual([mug]);
    expect(send).toHaveBeenCalledWith(CATALOG_PATTERNS.list, {});
  });

  it('forwards a product lookup by id', async () => {
    send.mockReturnValue(of(mug));

    await expect(controller.get('mug')).resolves.toEqual(mug);
    expect(send).toHaveBeenCalledWith(CATALOG_PATTERNS.get, { id: 'mug' });
  });

  it('responds 404 when the service has no such product', async () => {
    send.mockReturnValue(of(null));

    await expect(controller.get('nope')).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });
});
