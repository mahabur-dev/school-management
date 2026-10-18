import type { AuthSession } from '@/types/auth';

/**
 * Deliberately in-memory. Do not persist bearer tokens in localStorage.
 * Replace this boundary with secure httpOnly cookies when the API supports it.
 */
let currentSession: AuthSession | null = null;
let platformSession: AuthSession | null = null;

export const session = {
  get: () => currentSession,
  set: (value: AuthSession) => {
    currentSession = value;
  },
  clear: () => {
    currentSession = null;
    platformSession = null;
  },
  enterTenant: (value: AuthSession) => {
    if (currentSession?.user.role === 'SUPER_ADMIN') platformSession = currentSession;
    currentSession = value;
  },
  hasPlatformSession: () => platformSession !== null,
  restorePlatform: () => {
    if (!platformSession) return null;
    currentSession = platformSession;
    platformSession = null;
    return currentSession;
  },
};
