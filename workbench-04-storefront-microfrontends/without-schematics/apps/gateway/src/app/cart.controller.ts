import {
  Body,
  Controller,
  Delete,
  Get,
  Inject,
  NotFoundException,
  Param,
  Patch,
  Post,
} from '@nestjs/common';
import { ClientProxy } from '@nestjs/microservices';
import {
  CART_PATTERNS,
  CART_SERVICE,
  type AddLineBody,
  type AddLinePayload,
  type Cart,
  type GetCartPayload,
  type RemoveLinePayload,
  type SetQuantityBody,
  type SetQuantityPayload,
} from '@storefront/cart-contract';
import { firstValueFrom } from 'rxjs';

@Controller('cart')
export class CartController {
  constructor(@Inject(CART_SERVICE) private readonly client: ClientProxy) {}

  @Get(':cartId')
  get(@Param('cartId') cartId: string): Promise<Cart> {
    return firstValueFrom(
      this.client.send<Cart, GetCartPayload>(CART_PATTERNS.get, { cartId }),
    );
  }

  @Post(':cartId/lines')
  addLine(
    @Param('cartId') cartId: string,
    @Body() body: AddLineBody,
  ): Promise<Cart> {
    return firstValueFrom(
      this.client.send<Cart, AddLinePayload>(CART_PATTERNS.addLine, {
        productId: body?.productId,
        name: body?.name,
        unitPrice: body?.unitPrice,
        quantity: body?.quantity,
        cartId,
      }),
    );
  }

  @Patch(':cartId/lines/:productId')
  async setQuantity(
    @Param('cartId') cartId: string,
    @Param('productId') productId: string,
    @Body() body: SetQuantityBody,
  ): Promise<Cart> {
    const cart = await firstValueFrom(
      this.client.send<Cart | null, SetQuantityPayload>(
        CART_PATTERNS.setQuantity,
        { cartId, productId, quantity: body?.quantity },
      ),
    );
    if (!cart) throw new NotFoundException(`Line ${productId} not found`);
    return cart;
  }

  @Delete(':cartId/lines/:productId')
  async removeLine(
    @Param('cartId') cartId: string,
    @Param('productId') productId: string,
  ): Promise<Cart> {
    const cart = await firstValueFrom(
      this.client.send<Cart | null, RemoveLinePayload>(
        CART_PATTERNS.removeLine,
        { cartId, productId },
      ),
    );
    if (!cart) throw new NotFoundException(`Line ${productId} not found`);
    return cart;
  }
}
