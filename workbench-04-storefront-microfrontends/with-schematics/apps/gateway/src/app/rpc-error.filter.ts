import { ArgumentsHost, Catch, HttpException } from '@nestjs/common';
import { BaseExceptionFilter } from '@nestjs/core';

interface RpcHttpError {
  statusCode: number;
  message: string;
}

// A service's RpcException({ statusCode, message }) reaches the gateway as that
// plain object, which Nest would otherwise answer with a 500.
function isRpcHttpError(error: unknown): error is RpcHttpError {
  const { statusCode, message } = (error ?? {}) as Partial<RpcHttpError>;
  return (
    !(error instanceof HttpException) &&
    typeof statusCode === 'number' &&
    statusCode >= 400 &&
    statusCode < 600 &&
    typeof message === 'string'
  );
}

@Catch()
export class RpcErrorFilter extends BaseExceptionFilter {
  override catch(exception: unknown, host: ArgumentsHost) {
    super.catch(
      isRpcHttpError(exception)
        ? new HttpException(exception.message, exception.statusCode)
        : exception,
      host,
    );
  }
}
