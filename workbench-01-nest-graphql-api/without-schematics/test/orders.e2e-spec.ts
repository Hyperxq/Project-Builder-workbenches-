import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { App } from 'supertest/types';
import { Connection } from 'mongoose';
import { getConnectionToken } from '@nestjs/mongoose';
import { AppModule } from './../src/app.module';

interface GqlResponse {
  data?: Record<string, any>;
  errors?: Array<{ message: string }>;
}

// Requires MongoDB running (docker compose up -d mongodb) — AppModule boots
// the real database connection.
describe('Orders (e2e)', () => {
  let app: INestApplication<App>;
  let connection: Connection;

  const createOrder = {
    orderNumber: 1,
    customerEmail: 'user1@example.com',
    shipping: {
      address: 'address-1',
    },
  };

  const gql = async (
    query: string,
    variables?: Record<string, unknown>,
  ): Promise<GqlResponse> => {
    const res = await request(app.getHttpServer())
      .post('/graphql')
      .send({ query, variables })
      .expect(200);
    return res.body as GqlResponse;
  };

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    // Mirror the global pipe from main.ts — whitelist behavior is part of the
    // contract under test.
    app.useGlobalPipes(
      new ValidationPipe({ whitelist: true, transform: true }),
    );
    await app.init();

    connection = app.get<Connection>(getConnectionToken());
    await connection.collection('orders').deleteMany({});
  });

  afterAll(async () => {
    await connection.collection('orders').deleteMany({});
    await app.close();
  });

  it('createOrder persists and returns the order', async () => {
    const body = await gql(
      `mutation($input: CreateOrderInput!) {
        createOrder(createOrder: $input) { orderNumber customerEmail shipping { address } }
      }`,
      { input: createOrder },
    );

    expect(body.errors).toBeUndefined();
    expect(body.data?.createOrder).toEqual(createOrder);
  });

  it('orders lists the created order', async () => {
    const body = await gql(`{ orders { orderNumber } }`);

    expect(body.errors).toBeUndefined();
    expect(body.data?.orders).toEqual([
      { orderNumber: createOrder.orderNumber },
    ]);
  });

  it('order finds by orderNumber', async () => {
    const body = await gql(
      `query($get: GetOrderInput!) {
        order(getOrder: $get) { orderNumber }
      }`,
      { get: { orderNumber: createOrder.orderNumber } },
    );

    expect(body.errors).toBeUndefined();
    expect(body.data?.order).toEqual({
      orderNumber: createOrder.orderNumber,
    });
  });

  it('updateOrder applies and persists the change', async () => {
    const newValue = 'user2@example.com';

    const updated = await gql(
      `mutation($args: UpdateOrderArgs!) {
        updateOrder(updateOrderArgs: $args) { orderNumber customerEmail }
      }`,
      {
        args: {
          query: { orderNumber: createOrder.orderNumber },
          payload: { customerEmail: newValue },
        },
      },
    );

    expect(updated.errors).toBeUndefined();
    expect(updated.data?.updateOrder).toEqual({
      orderNumber: createOrder.orderNumber,
      customerEmail: newValue,
    });

    const persisted = await gql(
      `query($get: GetOrderInput!) {
        order(getOrder: $get) { customerEmail }
      }`,
      { get: { orderNumber: createOrder.orderNumber } },
    );

    expect(persisted.data?.order).toEqual({ customerEmail: newValue });
  });

  it('removeOrder deletes the order', async () => {
    const removed = await gql(
      `mutation($get: GetOrderInput!) {
        removeOrder(getOrder: $get) { orderNumber }
      }`,
      { get: { orderNumber: createOrder.orderNumber } },
    );

    expect(removed.errors).toBeUndefined();
    expect(removed.data?.removeOrder).toEqual({
      orderNumber: createOrder.orderNumber,
    });

    const list = await gql(`{ orders { orderNumber } }`);
    expect(list.data?.orders).toEqual([]);
  });
});
