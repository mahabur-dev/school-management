import { ApiError } from './error';

const API_URL = process.env.NEXT_PUBLIC_API_URL;

type RequestOptions = Omit<RequestInit, 'body' | 'headers'> & {
  body?: unknown;
  headers?: HeadersInit;
  accessToken?: string;
};

export async function apiRequest<T>(
  path: string,
  { body, headers, accessToken, ...options }: RequestOptions = {},
): Promise<T> {
  if (!API_URL) throw new Error('NEXT_PUBLIC_API_URL is not configured');

  const response = await fetch(`${API_URL}${path}`, {
    ...options,
    headers: {
      Accept: 'application/json',
      ...(body ? { 'Content-Type': 'application/json' } : {}),
      ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
      ...headers,
    },
    body: body === undefined ? undefined : JSON.stringify(body),
  });

  if (!response.ok) throw await ApiError.fromResponse(response);
  if (response.status === 204) return undefined as T;

  return (await response.json()) as T;
}
