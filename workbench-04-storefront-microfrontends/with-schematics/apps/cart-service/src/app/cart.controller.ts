import { Controller, HttpStatus } from '@nestjs/common';
import { MessagePattern, Payload, RpcException } from '@nestjs/microservices';
import {
  CART_PATTERNS,
  type AddLinePayload,
  type Cart,
  type GetCartPayload,
  type RemoveLinePayload,
  type SetQuantityPayload,
} from '@storefront/cart-contract';
import { CartService } from './cart.service';

// HTTP exceptions do not survive the TCP transport; the gateway's RpcErrorFilter
// turns this shape back into an HTTP status.
function invalid(message: string): RpcException {
  return new RpcException({ statusCode: HttpStatus.BAD_REQUEST, message });
}

function assertQuantity(quantity: unknown): asserts quantity is number {
  if (!Number.isInteger(quantity) || (quantity as number) < 1) {
    throw invalid('quantity must be an integer of at least 1');
  }
}

@Controller()
export class CartController {
  constructor(private readonly carts: CartService) {}

  @MessagePattern(CART_PATTERNS.get)
  get(@Payload() payload: GetCartPayload): Cart {
    return this.carts.get(payload.cartId);
  }

  @MessagePattern(CART_PATTERNS.addLine)
  addLine(@Payload() payload: AddLinePayload): Cart {
    assertQuantity(payload.quantity ?? 1);
    if (!payload.productId || !payload.name) {
      throw invalid('productId and name are required');
    }
    if (!Number.isInteger(payload.unitPrice) || payload.unitPrice < 0) {
      throw invalid('unitPrice must be a non-negative integer');
    }
    const { cartId, ...line } = payload;
    return this.carts.addLine(cartId, line);
  }

  @MessagePattern(CART_PATTERNS.setQuantity)
  setQuantity(@Payload() payload: SetQuantityPayload): Cart | null {
    assertQuantity(payload.quantity);
    return this.carts.setQuantity(
      payload.cartId,
      payload.productId,
      payload.quantity,
    );
  }

  @MessagePattern(CART_PATTERNS.removeLine)
  removeLine(@Payload() payload: RemoveLinePayload): Cart | null {
    return this.carts.removeLine(payload.cartId, payload.productId);
  }
}
