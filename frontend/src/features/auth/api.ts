import { apiRequest } from '@/lib/api/client';
import { endpoints } from '@/lib/api/endpoints';
import type { AuthSession, CurrentUser } from '@/types/auth';

export type ResolvedTenant = {
  id: string;
  name: string;
  slug: string;
};

export type LoginInput = {
  email: string;
  password: string;
  rememberMe?: boolean;
  portal?: 'PLATFORM' | 'SCHOOL';
  tenantSlug?: string;
};

export const authApi = {
  login: (input: LoginInput) =>
    apiRequest<AuthSession>(endpoints.auth.login, { method: 'POST', body: input }),
  resolveTenant: (query: string) =>
    apiRequest<ResolvedTenant>(endpoints.auth.resolveTenant, {
      method: 'POST',
      body: { query },
    }),
  refresh: () =>
    apiRequest<AuthSession>(endpoints.auth.refresh, { method: 'POST' }),
  me: (accessToken: string) =>
    apiRequest<CurrentUser>(endpoints.auth.me, { accessToken }),
  logout: (accessToken: string) =>
    apiRequest<void>(endpoints.auth.logout, { method: 'POST', accessToken }),
};
