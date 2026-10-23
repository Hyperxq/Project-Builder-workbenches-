import type {
  AddLineBody,
  Cart,
  SetQuantityBody,
} from '@storefront/cart-contract';

// The gateway serves the cart under /api; override per environment.
const GATEWAY_URL: string =
  (import.meta.env?.PUBLIC_GATEWAY_URL as string | undefined) ??
  'http://localhost:3000/api';

const CART_ID_KEY = 'storefront.cartId';

/** The cart id the microfrontend created and keeps in the browser. */
export function getCartId(): string {
  let id = localStorage.getItem(CART_ID_KEY);
  if (!id) {
    id = crypto.randomUUID();
    localStorage.setItem(CART_ID_KEY, id);
  }
  return id;
}

async function request(
  path: string,
  method: string,
  body?: unknown,
): Promise<Cart> {
  const response = await fetch(
    `${GATEWAY_URL}/cart/${encodeURIComponent(getCartId())}${path}`,
    {
      method,
      headers:
        body === undefined ? undefined : { 'Content-Type': 'application/json' },
      body: body === undefined ? undefined : JSON.stringify(body),
    },
  );
  if (!response.ok) {
    throw new Error(`Cart request failed (${response.status})`);
  }
  return (await response.json()) as Cart;
}

export function fetchCart(): Promise<Cart> {
  return request('', 'GET');
}

export function addLine(line: AddLineBody): Promise<Cart> {
  return request('/lines', 'POST', line);
}

export function setQuantity(
  productId: string,
  quantity: SetQuantityBody['quantity'],
): Promise<Cart> {
  return request(`/lines/${encodeURIComponent(productId)}`, 'PATCH', {
    quantity,
  });
}

export function removeLine(productId: string): Promise<Cart> {
  return request(`/lines/${encodeURIComponent(productId)}`, 'DELETE');
}
