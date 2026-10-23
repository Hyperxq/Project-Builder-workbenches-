import { RpcException } from '@nestjs/microservices';
import { Test } from '@nestjs/testing';
import { CART_PATTERNS } from '@storefront/cart-contract';
import { CartController } from './cart.controller';
import { CartService } from './cart.service';

const mug = { cartId: 'c1', productId: 'mug', name: 'Mug', unitPrice: 1800 };

describe('CartController', () => {
  let controller: CartController;

  beforeEach(async () => {
    const moduleRef = await Test.createTestingModule({
      controllers: [CartController],
      providers: [CartService],
    }).compile();
    controller = moduleRef.get(CartController);
  });

  it('returns an empty cart for a new id', () => {
    expect(controller.get({ cartId: 'new' })).toMatchObject({
      id: 'new',
      lines: [],
      total: 0,
    });
  });

  it('adds a line with a computed line total and cart total', () => {
    controller.addLine({ ...mug, quantity: 2 });
    const cart = controller.addLine({
      cartId: 'c1',
      productId: 'tote',
      name: 'Tote',
      unitPrice: 2400,
    });

    expect(cart.lines).toEqual([
      {
        productId: 'mug',
        name: 'Mug',
        unitPrice: 1800,
        quantity: 2,
        lineTotal: 3600,
      },
      {
        productId: 'tote',
        name: 'Tote',
        unitPrice: 2400,
        quantity: 1,
        lineTotal: 2400,
      },
    ]);
    expect(cart.total).toBe(6000);
  });

  it('merges a repeated product into one line', () => {
    controller.addLine(mug);
    const cart = controller.addLine(mug);
    expect(cart.lines).toHaveLength(1);
    expect(cart.lines[0].quantity).toBe(2);
  });

  it('keeps carts separate by id', () => {
    controller.addLine(mug);
    expect(controller.get({ cartId: 'other' }).lines).toEqual([]);
  });

  it('changes a line quantity', () => {
    controller.addLine(mug);
    const cart = controller.setQuantity({
      cartId: 'c1',
      productId: 'mug',
      quantity: 5,
    });
    expect(cart?.lines[0]).toMatchObject({ quantity: 5, lineTotal: 9000 });
    expect(cart?.total).toBe(9000);
  });

  it('replies null when changing or removing an absent line', () => {
    expect(
      controller.setQuantity({ cartId: 'c1', productId: 'x', quantity: 1 }),
    ).toBeNull();
    expect(controller.removeLine({ cartId: 'c1', productId: 'x' })).toBeNull();
  });

  it('removes a line', () => {
    controller.addLine(mug);
    const cart = controller.removeLine({ cartId: 'c1', productId: 'mug' });
    expect(cart).toMatchObject({ lines: [], total: 0 });
  });

  it('sends invalid input back as a 400 the gateway can map', () => {
    expect.assertions(1);
    try {
      controller.addLine({ ...mug, quantity: 0 });
    } catch (error) {
      expect((error as RpcException).getError()).toEqual({
        statusCode: 400,
        message: 'quantity must be an integer of at least 1',
      });
    }
  });

  it('rejects invalid quantities and prices', () => {
    expect(() => controller.addLine({ ...mug, quantity: 0 })).toThrow(
      RpcException,
    );
    expect(() => controller.addLine({ ...mug, unitPrice: -1 })).toThrow(
      RpcException,
    );
    controller.addLine(mug);
    expect(() =>
      controller.setQuantity({ cartId: 'c1', productId: 'mug', quantity: 1.5 }),
    ).toThrow(RpcException);
  });

  it('uses the shared message patterns', () => {
    const pattern = (fn: object) =>
      Reflect.getMetadata('microservices:pattern', fn);
    expect(pattern(controller.get)).toEqual([CART_PATTERNS.get]);
    expect(pattern(controller.addLine)).toEqual([CART_PATTERNS.addLine]);
    expect(pattern(controller.setQuantity)).toEqual([
      CART_PATTERNS.setQuantity,
    ]);
    expect(pattern(controller.removeLine)).toEqual([CART_PATTERNS.removeLine]);
  });
});
