import { apiRequest } from '@/lib/api/client';
import { endpoints } from '@/lib/api/endpoints';
import type { AuthSession, CurrentUser } from '@/types/auth';

export type LoginInput = {
  email: string;
  password: string;
  rememberMe?: boolean;
};

export const authApi = {
  login: (input: LoginInput) =>
    apiRequest<AuthSession>(endpoints.auth.login, { method: 'POST', body: input }),
  me: (accessToken: string) =>
    apiRequest<CurrentUser>(endpoints.auth.me, { accessToken }),
  logout: (accessToken: string) =>
    apiRequest<void>(endpoints.auth.logout, { method: 'POST', accessToken }),
};
