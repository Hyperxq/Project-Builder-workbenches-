import {
  Body,
  Controller,
  Get,
  Inject,
  NotFoundException,
  Param,
  Post,
} from '@nestjs/common';
import { ClientProxy } from '@nestjs/microservices';
import {
  ORDERS_PATTERNS,
  ORDERS_SERVICE,
  type GetOrderPayload,
  type ListOrdersPayload,
  type Order,
  type OrderSummary,
  type PlaceOrderBody,
  type PlaceOrderPayload,
} from '@storefront/orders-contract';
import { firstValueFrom } from 'rxjs';

@Controller('orders')
export class OrdersController {
  constructor(@Inject(ORDERS_SERVICE) private readonly client: ClientProxy) {}

  @Post(':customerId')
  place(
    @Param('customerId') customerId: string,
    @Body() body: PlaceOrderBody,
  ): Promise<Order> {
    return firstValueFrom(
      this.client.send<Order, PlaceOrderPayload>(ORDERS_PATTERNS.place, {
        lines: body?.lines,
        customerId,
      }),
    );
  }

  @Get(':customerId')
  list(@Param('customerId') customerId: string): Promise<OrderSummary[]> {
    return firstValueFrom(
      this.client.send<OrderSummary[], ListOrdersPayload>(
        ORDERS_PATTERNS.list,
        { customerId },
      ),
    );
  }

  @Get(':customerId/:orderId')
  async get(
    @Param('customerId') customerId: string,
    @Param('orderId') orderId: string,
  ): Promise<Order> {
    const order = await firstValueFrom(
      this.client.send<Order | null, GetOrderPayload>(ORDERS_PATTERNS.get, {
        customerId,
        orderId,
      }),
    );
    if (!order) throw new NotFoundException(`Order ${orderId} not found`);
    return order;
  }
}
