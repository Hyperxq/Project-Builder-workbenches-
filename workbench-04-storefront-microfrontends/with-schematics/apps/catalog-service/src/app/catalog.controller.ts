import { Controller } from '@nestjs/common';
import { MessagePattern, Payload } from '@nestjs/microservices';
import {
  CATALOG_PATTERNS,
  type GetProductPayload,
  type Product,
} from '@storefront/catalog-contract';
import { CatalogService } from './catalog.service';

@Controller()
export class CatalogController {
  constructor(private readonly catalog: CatalogService) {}

  @MessagePattern(CATALOG_PATTERNS.list)
  list(): Product[] {
    return this.catalog.list();
  }

  @MessagePattern(CATALOG_PATTERNS.get)
  get(@Payload() payload: GetProductPayload): Product | null {
    return this.catalog.get(payload.id);
  }
}
