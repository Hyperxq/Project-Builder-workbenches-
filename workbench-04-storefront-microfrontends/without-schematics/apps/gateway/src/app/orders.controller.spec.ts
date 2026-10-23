import { NotFoundException } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import {
  ORDERS_PATTERNS,
  ORDERS_SERVICE,
  type Order,
} from '@storefront/orders-contract';
import { of } from 'rxjs';
import { OrdersController } from './orders.controller';

const order: Order = {
  id: 'o1',
  customerId: 'c1',
  placedAt: '2026-01-01T00:00:00.000Z',
  status: 'placed',
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

describe('OrdersController (gateway)', () => {
  let controller: OrdersController;
  const send = jest.fn();

  beforeEach(async () => {
    send.mockReset();
    const moduleRef = await Test.createTestingModule({
      controllers: [OrdersController],
      providers: [{ provide: ORDERS_SERVICE, useValue: { send } }],
    }).compile();
    controller = moduleRef.get(OrdersController);
  });

  it('forwards a placed order with the customer id', async () => {
    send.mockReturnValue(of(order));
    const body = {
      lines: [{ productId: 'mug', name: 'Mug', unitPrice: 1800, quantity: 2 }],
    };

    await expect(controller.place('c1', body)).resolves.toEqual(order);
    expect(send).toHaveBeenCalledWith(ORDERS_PATTERNS.place, {
      ...body,
      customerId: 'c1',
    });
  });

  it('forwards the order list of a customer', async () => {
    const summary = { ...order, lines: undefined };
    send.mockReturnValue(of([summary]));

    await expect(controller.list('c1')).resolves.toEqual([summary]);
    expect(send).toHaveBeenCalledWith(ORDERS_PATTERNS.list, {
      customerId: 'c1',
    });
  });

  it('forwards an order lookup', async () => {
    send.mockReturnValue(of(order));

    await expect(controller.get('c1', 'o1')).resolves.toEqual(order);
    expect(send).toHaveBeenCalledWith(ORDERS_PATTERNS.get, {
      customerId: 'c1',
      orderId: 'o1',
    });
  });

  it('responds 404 when the order does not exist', async () => {
    send.mockReturnValue(of(null));

    await expect(controller.get('c1', 'nope')).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });
});
