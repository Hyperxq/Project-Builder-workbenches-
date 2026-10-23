import type {
  Order,
  OrderSummary,
  PlaceOrderBody,
} from '@storefront/orders-contract';

// The gateway serves the orders under /api; override per environment.
const GATEWAY_URL: string =
  (import.meta.env?.PUBLIC_GATEWAY_URL as string | undefined) ??
  'http://localhost:3000/api';

const CUSTOMER_ID_KEY = 'storefront.customerId';

/** The customer id the microfrontend created and keeps in the browser. */
export function getCustomerId(): string {
  let id = localStorage.getItem(CUSTOMER_ID_KEY);
  if (!id) {
    id = crypto.randomUUID();
    localStorage.setItem(CUSTOMER_ID_KEY, id);
  }
  return id;
}

async function request<T>(
  path: string,
  method: string,
  body?: unknown,
): Promise<T> {
  const response = await fetch(
    `${GATEWAY_URL}/orders/${encodeURIComponent(getCustomerId())}${path}`,
    {
      method,
      headers:
        body === undefined ? undefined : { 'Content-Type': 'application/json' },
      body: body === undefined ? undefined : JSON.stringify(body),
    },
  );
  if (!response.ok) {
    throw new Error(`Orders request failed (${response.status})`);
  }
  return (await response.json()) as T;
}

export function fetchOrders(): Promise<OrderSummary[]> {
  return request('', 'GET');
}

export function fetchOrder(orderId: string): Promise<Order> {
  return request(`/${encodeURIComponent(orderId)}`, 'GET');
}

export function placeOrder(lines: PlaceOrderBody['lines']): Promise<Order> {
  return request('', 'POST', { lines });
}
