import type { Product } from '@storefront/catalog-contract';

// The gateway serves the catalog under /api; override per environment.
const GATEWAY_URL: string =
  (import.meta.env?.PUBLIC_GATEWAY_URL as string | undefined) ??
  'http://localhost:3000/api';

async function getJson<T>(path: string): Promise<T> {
  const response = await fetch(`${GATEWAY_URL}${path}`);
  if (!response.ok) {
    throw new Error(`Catalog request failed (${response.status})`);
  }
  return (await response.json()) as T;
}

export function fetchProducts(): Promise<Product[]> {
  return getJson<Product[]>('/products');
}

export function fetchProduct(id: string): Promise<Product> {
  return getJson<Product>(`/products/${encodeURIComponent(id)}`);
}
