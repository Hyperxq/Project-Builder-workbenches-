import { Logger } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { Transport, type MicroserviceOptions } from '@nestjs/microservices';
import { CART_SERVICE_DEFAULT_PORT } from '@storefront/cart-contract';
import { AppModule } from './app/app.module';

// TCP microservice only: there is no HTTP listener.
async function bootstrap() {
  const port = Number(
    process.env.CART_SERVICE_PORT ?? CART_SERVICE_DEFAULT_PORT,
  );
  const app = await NestFactory.createMicroservice<MicroserviceOptions>(
    AppModule,
    { transport: Transport.TCP, options: { host: '0.0.0.0', port } },
  );
  await app.listen();
  Logger.log(`Cart service listening on tcp://0.0.0.0:${port}`);
}

bootstrap();
