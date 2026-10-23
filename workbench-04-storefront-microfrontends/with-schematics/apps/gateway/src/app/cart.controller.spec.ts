import { NotFoundException } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import {
  CART_PATTERNS,
  CART_SERVICE,
  type Cart,
} from '@storefront/cart-contract';
import { of } from 'rxjs';
import { CartController } from './cart.controller';

const cart: Cart = {
  id: 'c1',
  currency: 'USD',
  total: 3600,
  lines: [
    {
      productId: 'mug',
      name: 'Mug',
      unitPrice: 1800,
      quantity: 2,
      lineTotal: 3600,
    },
  ],
};

describe('CartController (gateway)', () => {
  let controller: CartController;
  const send = jest.fn();

  beforeEach(async () => {
    send.mockReset();
    const moduleRef = await Test.createTestingModule({
      controllers: [CartController],
      providers: [{ provide: CART_SERVICE, useValue: { send } }],
    }).compile();
    controller = moduleRef.get(CartController);
  });

  it('forwards a cart lookup', async () => {
    send.mockReturnValue(of(cart));

    await expect(controller.get('c1')).resolves.toEqual(cart);
    expect(send).toHaveBeenCalledWith(CART_PATTERNS.get, { cartId: 'c1' });
  });

  it('forwards an added line with the cart id', async () => {
    send.mockReturnValue(of(cart));
    const body = {
      productId: 'mug',
      name: 'Mug',
      unitPrice: 1800,
      quantity: 2,
    };

    await expect(controller.addLine('c1', body)).resolves.toEqual(cart);
    expect(send).toHaveBeenCalledWith(CART_PATTERNS.addLine, {
      ...body,
      cartId: 'c1',
    });
  });

  it('forwards a quantity change', async () => {
    send.mockReturnValue(of(cart));

    await expect(
      controller.setQuantity('c1', 'mug', { quantity: 2 }),
    ).resolves.toEqual(cart);
    expect(send).toHaveBeenCalledWith(CART_PATTERNS.setQuantity, {
      cartId: 'c1',
      productId: 'mug',
      quantity: 2,
    });
  });

  it('forwards a line removal', async () => {
    send.mockReturnValue(of(cart));

    await expect(controller.removeLine('c1', 'mug')).resolves.toEqual(cart);
    expect(send).toHaveBeenCalledWith(CART_PATTERNS.removeLine, {
      cartId: 'c1',
      productId: 'mug',
    });
  });

  it('responds 404 when the line does not exist', async () => {
    send.mockReturnValue(of(null));

    await expect(
      controller.setQuantity('c1', 'x', { quantity: 1 }),
    ).rejects.toBeInstanceOf(NotFoundException);
    await expect(controller.removeLine('c1', 'x')).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });
});
