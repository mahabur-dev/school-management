import type { AuthSession } from '@/types/auth';

/**
 * Deliberately in-memory. Do not persist bearer tokens in localStorage.
 * Replace this boundary with secure httpOnly cookies when the API supports it.
 */
let currentSession: AuthSession | null = null;
let platformSession: AuthSession | null = null;
const listeners = new Set<(value: AuthSession | null) => void>();

function notify() {
  listeners.forEach((listener) => listener(currentSession));
}

export const session = {
  get: () => currentSession,
  set: (value: AuthSession) => {
    currentSession = value;
    notify();
  },
  clear: () => {
    currentSession = null;
    platformSession = null;
    notify();
  },
  enterTenant: (value: AuthSession) => {
    if (currentSession?.user.role === 'SUPER_ADMIN') platformSession = currentSession;
    currentSession = value;
    notify();
  },
  hasPlatformSession: () => platformSession !== null,
  restorePlatform: () => {
    if (!platformSession) return null;
    currentSession = platformSession;
    platformSession = null;
    notify();
    return currentSession;
  },
  subscribe: (listener: (value: AuthSession | null) => void) => {
    listeners.add(listener);
    return () => {
      listeners.delete(listener);
    };
  },
};
