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
describe('Customers (e2e)', () => {
  let app: INestApplication<App>;
  let connection: Connection;

  const ada = {
    customerId: 1,
    name: 'Ada Lovelace',
    email: 'ada@example.com',
    address: 'Buenos Aires',
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
    await connection.collection('customers').deleteMany({});
  });

  afterAll(async () => {
    await connection.collection('customers').deleteMany({});
    await app.close();
  });

  it('createCustomer persists and returns the customer', async () => {
    const body = await gql(
      `mutation($input: CreateCustomerInput!) {
        createCustomer(createCustomer: $input) {
          customerId name email address isActive
        }
      }`,
      { input: ada },
    );

    expect(body.errors).toBeUndefined();
    expect(body.data?.createCustomer).toEqual({
      ...ada,
      isActive: true,
    });
  });

  it('customers lists the created customer', async () => {
    const body = await gql(`{ customers { customerId email } }`);

    expect(body.errors).toBeUndefined();
    expect(body.data?.customers).toEqual([
      { customerId: ada.customerId, email: ada.email },
    ]);
  });

  it('customer finds by customerId', async () => {
    const body = await gql(
      `query($get: GetCustomerInput!) {
        customer(getCustomer: $get) { customerId name }
      }`,
      { get: { customerId: ada.customerId } },
    );

    expect(body.errors).toBeUndefined();
    expect(body.data?.customer).toEqual({
      customerId: ada.customerId,
      name: ada.name,
    });
  });

  it('customer finds by email', async () => {
    const body = await gql(
      `query($get: GetCustomerInput!) {
        customer(getCustomer: $get) { customerId email }
      }`,
      { get: { email: ada.email } },
    );

    expect(body.errors).toBeUndefined();
    expect(body.data?.customer).toEqual({
      customerId: ada.customerId,
      email: ada.email,
    });
  });

  it('updateCustomer applies and returns the updated document', async () => {
    const updated = await gql(
      `mutation($args: UpdateCustomerArgs!) {
        updateCustomer(updateCustomerArgs: $args) { customerId address }
      }`,
      {
        args: {
          query: { customerId: ada.customerId },
          payload: { address: 'CABA, Argentina' },
        },
      },
    );

    expect(updated.errors).toBeUndefined();
    expect(updated.data?.updateCustomer).toEqual({
      customerId: ada.customerId,
      address: 'CABA, Argentina',
    });

    const persisted = await gql(
      `query($get: GetCustomerInput!) {
        customer(getCustomer: $get) { address }
      }`,
      { get: { customerId: ada.customerId } },
    );

    expect(persisted.data?.customer).toEqual({ address: 'CABA, Argentina' });
  });

  it('rejects a create with invalid input', async () => {
    const body = await gql(
      `mutation($input: CreateCustomerInput!) {
        createCustomer(createCustomer: $input) { customerId }
      }`,
      { input: { ...ada, customerId: 2, email: 'not-an-email' } },
    );

    expect(body.errors).toBeDefined();
    expect(body.data ?? null).toBeNull();
  });

  it('removeCustomer deletes the customer', async () => {
    const removed = await gql(
      `mutation($get: GetCustomerInput!) {
        removeCustomer(getCustomer: $get) { customerId }
      }`,
      { get: { customerId: ada.customerId } },
    );

    expect(removed.errors).toBeUndefined();
    expect(removed.data?.removeCustomer).toEqual({
      customerId: ada.customerId,
    });

    const list = await gql(`{ customers { customerId } }`);
    expect(list.data?.customers).toEqual([]);
  });
});
