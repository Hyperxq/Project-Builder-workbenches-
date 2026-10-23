/** Status of an order. A new order is `placed`; no other transition exists yet. */
export type OrderStatus = 'placed';

/** One line of an order. Prices are in minor units (cents). */
export interface OrderLine {
  productId: string;
  name: string;
  unitPrice: number;
  quantity: number;
  /** `unitPrice * quantity`, computed by the service. */
  lineTotal: number;
}

/** An order with its lines, as returned by the service. `total` is in minor units. */
export interface Order {
  id: string;
  customerId: string;
  /** ISO 8601 timestamp of when the order was placed. */
  placedAt: string;
  status: OrderStatus;
  lines: OrderLine[];
  total: number;
  currency: string;
}

/** What the order list shows for each order. */
export interface OrderSummary {
  id: string;
  placedAt: string;
  status: OrderStatus;
  total: number;
  currency: string;
}

/** A line as sent by the client when placing an order. */
export interface PlaceOrderLine {
  productId: string;
  name: string;
  unitPrice: number;
  /** An integer of at least 1. */
  quantity: number;
}

/** Body of `POST /orders/:customerId`. */
export interface PlaceOrderBody {
  lines: PlaceOrderLine[];
}

export interface PlaceOrderPayload extends PlaceOrderBody {
  customerId: string;
}

export interface ListOrdersPayload {
  customerId: string;
}

export interface GetOrderPayload {
  customerId: string;
  orderId: string;
}

/** NestJS microservice message patterns served by the orders service. */
export const ORDERS_PATTERNS = {
  /** payload: `PlaceOrderPayload`, reply: `Order` */
  place: 'orders.place',
  /** payload: `ListOrdersPayload`, reply: `OrderSummary[]` (empty for a new customer), newest first */
  list: 'orders.list',
  /** payload: `GetOrderPayload`, reply: `Order | null` (null when the customer has no such order) */
  get: 'orders.get',
} as const;

/** Injection token of the orders `ClientProxy` in the gateway. */
export const ORDERS_SERVICE = 'ORDERS_SERVICE';

/** TCP port of the orders service unless `ORDERS_SERVICE_PORT` overrides it. */
export const ORDERS_SERVICE_DEFAULT_PORT = 4103;
