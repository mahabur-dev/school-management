import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
  StreamableFile,
} from '@nestjs/common';
import { REDIRECT_METADATA } from '@nestjs/common/constants';
import { map, Observable } from 'rxjs';

/** Wraps JSON responses while preserving redirects and binary file streams. */
@Injectable()
export class ResponseInterceptor implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const redirect = Reflect.getMetadata(
      REDIRECT_METADATA,
      context.getHandler(),
    ) as unknown;
    if (redirect !== undefined) return next.handle();

    return next
      .handle()
      .pipe(
        map((data) =>
          data instanceof StreamableFile ? data : { success: true, data },
        ),
      );
  }
}
