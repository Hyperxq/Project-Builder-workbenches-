import { RpcException } from '@nestjs/microservices';
import { Test } from '@nestjs/testing';
import { ORDERS_PATTERNS } from '@storefront/orders-contract';
import { OrdersController } from './orders.controller';
import { OrdersService } from './orders.service';

const lines = [
  { productId: 'mug', name: 'Mug', unitPrice: 1800, quantity: 2 },
  { productId: 'tote', name: 'Tote', unitPrice: 2400, quantity: 1 },
];

describe('OrdersController', () => {
  let controller: OrdersController;

  beforeEach(async () => {
    const moduleRef = await Test.createTestingModule({
      controllers: [OrdersController],
      providers: [OrdersService],
    }).compile();
    controller = moduleRef.get(OrdersController);
  });

  it('places an order with status placed and computed totals', () => {
    const order = controller.place({ customerId: 'c1', lines });

    expect(order).toMatchObject({
      customerId: 'c1',
      status: 'placed',
      total: 6000,
      currency: 'USD',
    });
    expect(order.id).toBeTruthy();
    expect(Number.isNaN(Date.parse(order.placedAt))).toBe(false);
    expect(order.lines[0]).toEqual({ ...lines[0], lineTotal: 3600 });
  });

  it('lists a customer orders as summaries, newest first', () => {
    const first = controller.place({ customerId: 'c1', lines });
    const second = controller.place({ customerId: 'c1', lines: [lines[1]] });

    const list = controller.list({ customerId: 'c1' });

    expect(list.map((o) => o.id)).toEqual([second.id, first.id]);
    expect(list[0]).toEqual({
      id: second.id,
      placedAt: second.placedAt,
      status: 'placed',
      total: 2400,
      currency: 'USD',
    });
    expect(list[0]).not.toHaveProperty('lines');
  });

  it('keeps customers separate', () => {
    const order = controller.place({ customerId: 'c1', lines });

    expect(controller.list({ customerId: 'other' })).toEqual([]);
    expect(
      controller.get({ customerId: 'other', orderId: order.id }),
    ).toBeNull();
  });

  it('returns one order with its lines', () => {
    const order = controller.place({ customerId: 'c1', lines });
    expect(controller.get({ customerId: 'c1', orderId: order.id })).toEqual(
      order,
    );
  });

  it('replies null for an unknown order', () => {
    expect(controller.get({ customerId: 'c1', orderId: 'nope' })).toBeNull();
  });

  it('sends invalid input back as a 400 the gateway can map', () => {
    expect.assertions(1);
    try {
      controller.place({ customerId: 'c1', lines: [] });
    } catch (error) {
      expect((error as RpcException).getError()).toEqual({
        statusCode: 400,
        message: 'an order needs at least one line',
      });
    }
  });

  it('rejects invalid payloads', () => {
    expect(() => controller.place({ customerId: 'c1', lines: [] })).toThrow(
      RpcException,
    );
    expect(() => controller.place({ customerId: '', lines })).toThrow(
      RpcException,
    );
    expect(() =>
      controller.place({
        customerId: 'c1',
        lines: [{ ...lines[0], quantity: 0 }],
      }),
    ).toThrow(RpcException);
    expect(() =>
      controller.place({
        customerId: 'c1',
        lines: [{ ...lines[0], unitPrice: -1 }],
      }),
    ).toThrow(RpcException);
    expect(() =>
      controller.place({
        customerId: 'c1',
        lines: [{ ...lines[0], name: '' }],
      }),
    ).toThrow(RpcException);
    expect(() => controller.list({ customerId: '' })).toThrow(
      RpcException,
    );
  });

  it('uses the shared message patterns', () => {
    const pattern = (fn: object) =>
      Reflect.getMetadata('microservices:pattern', fn);
    expect(pattern(controller.place)).toEqual([ORDERS_PATTERNS.place]);
    expect(pattern(controller.list)).toEqual([ORDERS_PATTERNS.list]);
    expect(pattern(controller.get)).toEqual([ORDERS_PATTERNS.get]);
  });
});
