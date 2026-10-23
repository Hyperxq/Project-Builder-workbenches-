import { Injectable } from '@nestjs/common';
import type {
  Order,
  OrderSummary,
  PlaceOrderLine,
} from '@storefront/orders-contract';
import { randomUUID } from 'crypto';

const CURRENCY = 'USD';

@Injectable()
export class OrdersService {
  private readonly orders = new Map<string, Order[]>();

  place(customerId: string, lines: PlaceOrderLine[]): Order {
    const orderLines = lines.map((l) => ({
      productId: l.productId,
      name: l.name,
      unitPrice: l.unitPrice,
      quantity: l.quantity,
      lineTotal: l.unitPrice * l.quantity,
    }));
    const order: Order = {
      id: randomUUID(),
      customerId,
      placedAt: new Date().toISOString(),
      status: 'placed',
      lines: orderLines,
      total: orderLines.reduce((sum, l) => sum + l.lineTotal, 0),
      currency: CURRENCY,
    };
    this.orders.set(customerId, [
      ...(this.orders.get(customerId) ?? []),
      order,
    ]);
    return order;
  }

  /** Newest first. */
  list(customerId: string): OrderSummary[] {
    return [...(this.orders.get(customerId) ?? [])]
      .reverse()
      .map(({ id, placedAt, status, total, currency }) => ({
        id,
        placedAt,
        status,
        total,
        currency,
      }));
  }

  /** Returns null when the customer has no such order. */
  get(customerId: string, orderId: string): Order | null {
    return this.orders.get(customerId)?.find((o) => o.id === orderId) ?? null;
  }
}
