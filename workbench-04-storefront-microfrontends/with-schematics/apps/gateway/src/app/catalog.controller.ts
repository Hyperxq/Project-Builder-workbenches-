import {
  Controller,
  Get,
  Inject,
  NotFoundException,
  Param,
} from '@nestjs/common';
import { ClientProxy } from '@nestjs/microservices';
import {
  CATALOG_PATTERNS,
  CATALOG_SERVICE,
  type GetProductPayload,
  type Product,
} from '@storefront/catalog-contract';
import { firstValueFrom } from 'rxjs';

@Controller('products')
export class CatalogController {
  constructor(@Inject(CATALOG_SERVICE) private readonly client: ClientProxy) {}

  @Get()
  list(): Promise<Product[]> {
    return firstValueFrom(
      this.client.send<Product[], Record<string, never>>(
        CATALOG_PATTERNS.list,
        {},
      ),
    );
  }

  @Get(':id')
  async get(@Param('id') id: string): Promise<Product> {
    const product = await firstValueFrom(
      this.client.send<Product | null, GetProductPayload>(
        CATALOG_PATTERNS.get,
        { id },
      ),
    );
    if (!product) throw new NotFoundException(`Product ${id} not found`);
    return product;
  }
}
