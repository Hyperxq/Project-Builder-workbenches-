import { Injectable } from '@nestjs/common';
import type { Cart, CartLine } from '@storefront/cart-contract';

const CURRENCY = 'USD';

type StoredLine = Omit<CartLine, 'lineTotal'>;

@Injectable()
export class CartService {
  private readonly carts = new Map<string, StoredLine[]>();

  get(cartId: string): Cart {
    return this.view(cartId);
  }

  addLine(
    cartId: string,
    line: {
      productId: string;
      name: string;
      unitPrice: number;
      quantity?: number;
    },
  ): Cart {
    const quantity = line.quantity ?? 1;
    const lines = this.linesOf(cartId);
    const existing = lines.find((l) => l.productId === line.productId);
    if (existing) {
      existing.quantity += quantity;
    } else {
      lines.push({
        productId: line.productId,
        name: line.name,
        unitPrice: line.unitPrice,
        quantity,
      });
    }
    this.carts.set(cartId, lines);
    return this.view(cartId);
  }

  /** Returns null when the cart has no such line. */
  setQuantity(
    cartId: string,
    productId: string,
    quantity: number,
  ): Cart | null {
    const line = this.carts.get(cartId)?.find((l) => l.productId === productId);
    if (!line) return null;
    line.quantity = quantity;
    return this.view(cartId);
  }

  /** Returns null when the cart has no such line. */
  removeLine(cartId: string, productId: string): Cart | null {
    const lines = this.carts.get(cartId);
    if (!lines?.some((l) => l.productId === productId)) return null;
    this.carts.set(
      cartId,
      lines.filter((l) => l.productId !== productId),
    );
    return this.view(cartId);
  }

  private linesOf(cartId: string): StoredLine[] {
    return this.carts.get(cartId) ?? [];
  }

  private view(cartId: string): Cart {
    const lines = this.linesOf(cartId).map((l) => ({
      ...l,
      lineTotal: l.unitPrice * l.quantity,
    }));
    return {
      id: cartId,
      lines,
      total: lines.reduce((sum, l) => sum + l.lineTotal, 0),
      currency: CURRENCY,
    };
  }
}
