/** A product as shown in the storefront. `price` is in minor units (cents). */
export interface Product {
  id: string;
  name: string;
  price: number;
  currency: string;
  image: string;
  description: string;
}

/** NestJS microservice message patterns served by the catalog service. */
export const CATALOG_PATTERNS = {
  /** payload: none, reply: `Product[]` */
  list: 'catalog.list',
  /** payload: `GetProductPayload`, reply: `Product | null` */
  get: 'catalog.get',
} as const;

export interface GetProductPayload {
  id: string;
}

/** Injection token of the catalog `ClientProxy` in the gateway. */
export const CATALOG_SERVICE = 'CATALOG_SERVICE';

/** TCP port of the catalog service unless `CATALOG_SERVICE_PORT` overrides it. */
export const CATALOG_SERVICE_DEFAULT_PORT = 4101;
