import { Module } from '@nestjs/common';
import { APP_FILTER } from '@nestjs/core';
import { ClientsModule, Transport } from '@nestjs/microservices';
import {
  CATALOG_SERVICE,
  CATALOG_SERVICE_DEFAULT_PORT,
} from '@storefront/catalog-contract';
import {
  CART_SERVICE,
  CART_SERVICE_DEFAULT_PORT,
} from '@storefront/cart-contract';
import {
  ORDERS_SERVICE,
  ORDERS_SERVICE_DEFAULT_PORT,
} from '@storefront/orders-contract';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { CartController } from './cart.controller';
import { CatalogController } from './catalog.controller';
import { OrdersController } from './orders.controller';
import { RpcErrorFilter } from './rpc-error.filter';

@Module({
  imports: [
    ClientsModule.register([
      {
        name: CATALOG_SERVICE,
        transport: Transport.TCP,
        options: {
          host: process.env.CATALOG_SERVICE_HOST ?? 'localhost',
          port: Number(
            process.env.CATALOG_SERVICE_PORT ?? CATALOG_SERVICE_DEFAULT_PORT,
          ),
        },
      },
      {
        name: CART_SERVICE,
        transport: Transport.TCP,
        options: {
          host: process.env.CART_SERVICE_HOST ?? 'localhost',
          port: Number(
            process.env.CART_SERVICE_PORT ?? CART_SERVICE_DEFAULT_PORT,
          ),
        },
      },
      {
        name: ORDERS_SERVICE,
        transport: Transport.TCP,
        options: {
          host: process.env.ORDERS_SERVICE_HOST ?? 'localhost',
          port: Number(
            process.env.ORDERS_SERVICE_PORT ?? ORDERS_SERVICE_DEFAULT_PORT,
          ),
        },
      },
    ]),
  ],
  controllers: [
    AppController,
    CatalogController,
    CartController,
    OrdersController,
  ],
  providers: [AppService, { provide: APP_FILTER, useClass: RpcErrorFilter }],
})
export class AppModule {}
