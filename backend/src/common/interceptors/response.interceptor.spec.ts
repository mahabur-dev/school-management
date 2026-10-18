import { CallHandler, ExecutionContext, StreamableFile } from '@nestjs/common';
import { lastValueFrom, of } from 'rxjs';
import { ResponseInterceptor } from './response.interceptor';

describe('ResponseInterceptor', () => {
  const context = {
    getHandler: () => function handler() {},
  } as unknown as ExecutionContext;
  const interceptor = new ResponseInterceptor();

  it('wraps regular API responses', async () => {
    const next = { handle: () => of({ id: 'record-id' }) } as CallHandler;

    await expect(
      lastValueFrom(interceptor.intercept(context, next)),
    ).resolves.toEqual({ success: true, data: { id: 'record-id' } });
  });

  it('preserves binary streams without JSON wrapping', async () => {
    const file = new StreamableFile(Buffer.from('%PDF-test'));
    const next = { handle: () => of(file) } as CallHandler;

    await expect(
      lastValueFrom(interceptor.intercept(context, next)),
    ).resolves.toBe(file);
  });
});
