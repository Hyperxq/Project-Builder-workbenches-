/** One line of a cart. `unitPrice` is in minor units (cents). */
export interface CartLine {
  productId: string;
  name: string;
  unitPrice: number;
  quantity: number;
  /** `unitPrice * quantity`, computed by the service. */
  lineTotal: number;
}

/** A cart as returned by the service. `total` is in minor units (cents). */
export interface Cart {
  id: string;
  lines: CartLine[];
  total: number;
  currency: string;
}

/** NestJS microservice message patterns served by the cart service. */
export const CART_PATTERNS = {
  /** payload: `GetCartPayload`, reply: `Cart` (empty when the id is new) */
  get: 'cart.get',
  /** payload: `AddLinePayload`, reply: `Cart` */
  addLine: 'cart.addLine',
  /** payload: `SetQuantityPayload`, reply: `Cart | null` (null when the line is absent) */
  setQuantity: 'cart.setQuantity',
  /** payload: `RemoveLinePayload`, reply: `Cart | null` (null when the line is absent) */
  removeLine: 'cart.removeLine',
} as const;

export interface GetCartPayload {
  cartId: string;
}

/** Product fields sent by the client when a product is added. */
export interface AddLineBody {
  productId: string;
  name: string;
  unitPrice: number;
  /** Defaults to 1. */
  quantity?: number;
}

export interface AddLinePayload extends AddLineBody {
  cartId: string;
}

/** Body of `PATCH /cart/:cartId/lines/:productId`. */
export interface SetQuantityBody {
  /** An integer of at least 1; remove the line to get rid of it. */
  quantity: number;
}

export interface SetQuantityPayload extends SetQuantityBody {
  cartId: string;
  productId: string;
}

export interface RemoveLinePayload {
  cartId: string;
  productId: string;
}

/** Injection token of the cart `ClientProxy` in the gateway. */
export const CART_SERVICE = 'CART_SERVICE';

/** TCP port of the cart service unless `CART_SERVICE_PORT` overrides it. */
export const CART_SERVICE_DEFAULT_PORT = 4102;
