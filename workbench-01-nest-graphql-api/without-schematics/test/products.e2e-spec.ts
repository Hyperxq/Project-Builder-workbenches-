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
describe('Products (e2e)', () => {
  let app: INestApplication<App>;
  let connection: Connection;

  const createProduct = {
    sku: 'sku-1',
    title: 'title-1',
    price: 1,
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
    await connection.collection('products').deleteMany({});
  });

  afterAll(async () => {
    await connection.collection('products').deleteMany({});
    await app.close();
  });

  it('createProduct persists and returns the product', async () => {
    const body = await gql(
      `mutation($input: CreateProductInput!) {
        createProduct(createProduct: $input) { sku title price }
      }`,
      { input: createProduct },
    );

    expect(body.errors).toBeUndefined();
    expect(body.data?.createProduct).toEqual(createProduct);
  });

  it('products lists the created product', async () => {
    const body = await gql(`{ products { sku } }`);

    expect(body.errors).toBeUndefined();
    expect(body.data?.products).toEqual([{ sku: createProduct.sku }]);
  });

  it('product finds by sku', async () => {
    const body = await gql(
      `query($get: GetProductInput!) {
        product(getProduct: $get) { sku }
      }`,
      { get: { sku: createProduct.sku } },
    );

    expect(body.errors).toBeUndefined();
    expect(body.data?.product).toEqual({
      sku: createProduct.sku,
    });
  });

  it('updateProduct applies and persists the change', async () => {
    const newValue = 'title-2';

    const updated = await gql(
      `mutation($args: UpdateProductArgs!) {
        updateProduct(updateProductArgs: $args) { sku title }
      }`,
      {
        args: {
          query: { sku: createProduct.sku },
          payload: { title: newValue },
        },
      },
    );

    expect(updated.errors).toBeUndefined();
    expect(updated.data?.updateProduct).toEqual({
      sku: createProduct.sku,
      title: newValue,
    });

    const persisted = await gql(
      `query($get: GetProductInput!) {
        product(getProduct: $get) { title }
      }`,
      { get: { sku: createProduct.sku } },
    );

    expect(persisted.data?.product).toEqual({ title: newValue });
  });

  it('removeProduct deletes the product', async () => {
    const removed = await gql(
      `mutation($get: GetProductInput!) {
        removeProduct(getProduct: $get) { sku }
      }`,
      { get: { sku: createProduct.sku } },
    );

    expect(removed.errors).toBeUndefined();
    expect(removed.data?.removeProduct).toEqual({
      sku: createProduct.sku,
    });

    const list = await gql(`{ products { sku } }`);
    expect(list.data?.products).toEqual([]);
  });
});
