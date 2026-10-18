export class ApiError extends Error {
  constructor(
    message: string,
    readonly status: number,
    readonly details?: unknown,
  ) {
    super(message);
    this.name = 'ApiError';
  }

  static async fromResponse(response: Response): Promise<ApiError> {
    const payload: unknown = await response.json().catch(() => undefined);
    const body = payload as { message?: string | string[]; details?: unknown } | undefined;
    const message = Array.isArray(body?.message)
      ? body.message.join(', ')
      : body?.message ?? 'An unexpected error occurred';

    return new ApiError(message, response.status, body?.details);
  }
}
