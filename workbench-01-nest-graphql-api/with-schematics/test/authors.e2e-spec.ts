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
describe('Authors (e2e)', () => {
  let app: INestApplication<App>;
  let connection: Connection;

  const createAuthor = {
    authorId: 1,
    fullName: 'fullName-1',
    email: 'user1@example.com',
    country: 'country-1',
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
    await connection.collection('authors').deleteMany({});
  });

  afterAll(async () => {
    await connection.collection('authors').deleteMany({});
    await app.close();
  });

  it('createAuthor persists and returns the author', async () => {
    const body = await gql(
      `mutation($input: CreateAuthorInput!) {
        createAuthor(createAuthor: $input) { authorId fullName email country }
      }`,
      { input: createAuthor },
    );

    expect(body.errors).toBeUndefined();
    expect(body.data?.createAuthor).toEqual(createAuthor);
  });

  it('authors lists the created author', async () => {
    const body = await gql(`{ authors { authorId } }`);

    expect(body.errors).toBeUndefined();
    expect(body.data?.authors).toEqual([{ authorId: createAuthor.authorId }]);
  });

  it('author finds by authorId', async () => {
    const body = await gql(
      `query($get: GetAuthorInput!) {
        author(getAuthor: $get) { authorId }
      }`,
      { get: { authorId: createAuthor.authorId } },
    );

    expect(body.errors).toBeUndefined();
    expect(body.data?.author).toEqual({
      authorId: createAuthor.authorId,
    });
  });

  it('updateAuthor applies and persists the change', async () => {
    const newValue = 'fullName-2';

    const updated = await gql(
      `mutation($args: UpdateAuthorArgs!) {
        updateAuthor(updateAuthorArgs: $args) { authorId fullName }
      }`,
      {
        args: {
          query: { authorId: createAuthor.authorId },
          payload: { fullName: newValue },
        },
      },
    );

    expect(updated.errors).toBeUndefined();
    expect(updated.data?.updateAuthor).toEqual({
      authorId: createAuthor.authorId,
      fullName: newValue,
    });

    const persisted = await gql(
      `query($get: GetAuthorInput!) {
        author(getAuthor: $get) { fullName }
      }`,
      { get: { authorId: createAuthor.authorId } },
    );

    expect(persisted.data?.author).toEqual({ fullName: newValue });
  });

  it('removeAuthor deletes the author', async () => {
    const removed = await gql(
      `mutation($get: GetAuthorInput!) {
        removeAuthor(getAuthor: $get) { authorId }
      }`,
      { get: { authorId: createAuthor.authorId } },
    );

    expect(removed.errors).toBeUndefined();
    expect(removed.data?.removeAuthor).toEqual({
      authorId: createAuthor.authorId,
    });

    const list = await gql(`{ authors { authorId } }`);
    expect(list.data?.authors).toEqual([]);
  });
});
