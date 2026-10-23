import type { ArgumentsHost, HttpServer } from '@nestjs/common';
import { RpcErrorFilter } from './rpc-error.filter';

describe('RpcErrorFilter', () => {
  const response = {};
  const host = {
    getArgByIndex: () => response,
    getType: () => 'http',
  } as unknown as ArgumentsHost;
  let reply: jest.Mock;
  let filter: RpcErrorFilter;

  beforeEach(() => {
    reply = jest.fn();
    filter = new RpcErrorFilter({
      reply,
      isHeadersSent: () => false,
      end: jest.fn(),
    } as unknown as HttpServer);
  });

  it('answers with the status a service sent over the transport', () => {
    filter.catch(
      { statusCode: 400, message: 'quantity must be an integer of at least 1' },
      host,
    );

    expect(reply).toHaveBeenCalledWith(
      response,
      { statusCode: 400, message: 'quantity must be an integer of at least 1' },
      400,
    );
  });

  it('answers 500 for any other error', () => {
    jest.spyOn(console, 'error').mockImplementation(() => undefined);

    filter.catch({ status: 'error', message: 'Internal server error' }, host);

    expect(reply).toHaveBeenCalledWith(
      response,
      { statusCode: 500, message: 'Internal server error' },
      500,
    );
  });
});
