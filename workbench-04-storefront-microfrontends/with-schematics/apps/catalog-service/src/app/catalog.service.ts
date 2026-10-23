import { Injectable } from '@nestjs/common';
import type { Product } from '@storefront/catalog-contract';
import { PRODUCTS } from './products';

@Injectable()
export class CatalogService {
  private readonly products: readonly Product[] = PRODUCTS;

  list(): Product[] {
    return [...this.products];
  }

  get(id: string): Product | null {
    return this.products.find((product) => product.id === id) ?? null;
  }
}
