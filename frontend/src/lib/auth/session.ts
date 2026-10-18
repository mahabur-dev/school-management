import type { AuthSession } from '@/types/auth';

/**
 * Deliberately in-memory. Do not persist bearer tokens in localStorage.
 * Replace this boundary with secure httpOnly cookies when the API supports it.
 */
let currentSession: AuthSession | null = null;

export const session = {
  get: () => currentSession,
  set: (value: AuthSession) => {
    currentSession = value;
  },
  clear: () => {
    currentSession = null;
  },
};
