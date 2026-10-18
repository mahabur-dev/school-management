import { session } from '@/lib/auth/session';
import type { AuthSession } from '@/types/auth';
import { authApi } from './api';

/**
 * A refresh token is single-use. React development mode may replay effects,
 * so all dashboard guards share one in-flight refresh instead of accidentally
 * presenting the same token twice and revoking its entire session family.
 */
let restoreInFlight: Promise<AuthSession> | null = null;

export function restoreAuthSession(): Promise<AuthSession> {
  const activeSession = session.get();
  if (activeSession) return Promise.resolve(activeSession);

  if (!restoreInFlight) {
    restoreInFlight = authApi
      .refresh()
      .then((restoredSession) => {
        session.set(restoredSession);
        return restoredSession;
      })
      .finally(() => {
        restoreInFlight = null;
      });
  }

  return restoreInFlight;
}
