import { Controller, HttpStatus } from '@nestjs/common';
import { MessagePattern, Payload, RpcException } from '@nestjs/microservices';
import {
  ORDERS_PATTERNS,
  type GetOrderPayload,
  type ListOrdersPayload,
  type Order,
  type OrderSummary,
  type PlaceOrderPayload,
} from '@storefront/orders-contract';
import { OrdersService } from './orders.service';

// HTTP exceptions do not survive the TCP transport; the gateway's RpcErrorFilter
// turns this shape back into an HTTP status.
function invalid(message: string): RpcException {
  return new RpcException({ statusCode: HttpStatus.BAD_REQUEST, message });
}

function assertCustomerId(customerId: unknown): asserts customerId is string {
  if (typeof customerId !== 'string' || !customerId) {
    throw invalid('customerId is required');
  }
}

@Controller()
export class OrdersController {
  constructor(private readonly orders: OrdersService) {}

  @MessagePattern(ORDERS_PATTERNS.place)
  place(@Payload() payload: PlaceOrderPayload): Order {
    assertCustomerId(payload?.customerId);
    if (!Array.isArray(payload.lines) || payload.lines.length === 0) {
      throw invalid('an order needs at least one line');
    }
    for (const line of payload.lines) {
      if (!line?.productId || !line.name) {
        throw invalid('productId and name are required');
      }
      if (!Number.isInteger(line.unitPrice) || line.unitPrice < 0) {
        throw invalid(
          'unitPrice must be a non-negative integer',
        );
      }
      if (!Number.isInteger(line.quantity) || line.quantity < 1) {
        throw invalid(
          'quantity must be an integer of at least 1',
        );
      }
    }
    return this.orders.place(payload.customerId, payload.lines);
  }

  @MessagePattern(ORDERS_PATTERNS.list)
  list(@Payload() payload: ListOrdersPayload): OrderSummary[] {
    assertCustomerId(payload?.customerId);
    return this.orders.list(payload.customerId);
  }

  @MessagePattern(ORDERS_PATTERNS.get)
  get(@Payload() payload: GetOrderPayload): Order | null {
    assertCustomerId(payload?.customerId);
    return this.orders.get(payload.customerId, payload.orderId);
  }
}
