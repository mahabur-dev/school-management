import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import type { Request, Response } from 'express';
import { Prisma } from '../../prisma';

type ErrorBody = {
  status: number;
  message: unknown;
  extra: Record<string, unknown>;
};

/** One error shape for the whole API: `{ success: false, statusCode, message, path, timestamp }`. */
@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(HttpExceptionFilter.name);

  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();
    const { status, message, extra } = this.normalize(exception);

    if (status >= 500) {
      this.logger.error(
        `Unhandled exception at ${request.method} ${request.path}`,
        exception instanceof Error ? exception.stack : String(exception),
      );
    }

    response.status(status).json({
      ...extra,
      success: false,
      statusCode: status,
      message,
      path: request.path,
      timestamp: new Date().toISOString(),
    });
  }

  private normalize(exception: unknown): ErrorBody {
    if (exception instanceof HttpException) {
      const body = exception.getResponse();
      if (typeof body === 'string') {
        return { status: exception.getStatus(), message: body, extra: {} };
      }
      const { message, statusCode, error, ...extra } = body as Record<
        string,
        unknown
      >;
      void statusCode;
      void error;
      return {
        status: exception.getStatus(),
        message: message ?? exception.message,
        extra,
      };
    }

    if (exception instanceof Prisma.PrismaClientKnownRequestError) {
      if (exception.code === 'P2002') {
        return {
          status: HttpStatus.CONFLICT,
          message: 'A record with these values already exists',
          extra: {},
        };
      }
      if (exception.code === 'P2025') {
        return {
          status: HttpStatus.NOT_FOUND,
          message: 'Record not found',
          extra: {},
        };
      }
    }

    return {
      status: HttpStatus.INTERNAL_SERVER_ERROR,
      message: 'Internal server error',
      extra: {},
    };
  }
}
