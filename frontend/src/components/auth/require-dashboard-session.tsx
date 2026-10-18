'use client';

import { useEffect, useState, type ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import { restoreAuthSession } from '@/features/auth/restore-session';
import { session } from '@/lib/auth/session';
import type { UserRole } from '@/types/auth';

type RequireDashboardSessionProps = {
  children: ReactNode;
  requiredRole: UserRole;
  loginHref: '/login' | '/super-admin/login';
};

/**
 * Prevents protected UI from rendering until the in-memory authenticated
 * session is present and belongs to the correct portal. API routes remain
 * protected by JWT guards independently of this navigation guard.
 */
export function RequireDashboardSession({
  children,
  requiredRole,
  loginHref,
}: RequireDashboardSessionProps) {
  const router = useRouter();
  const activeSession = session.get();
  const [checking, setChecking] = useState(activeSession === null);
  const allowed = session.get()?.user.role === requiredRole;

  useEffect(() => {
    if (allowed) {
      return;
    }

    restoreAuthSession()
      .then((restoredSession) => {
        if (restoredSession.user.role !== requiredRole) {
          router.replace(loginHref);
        }
      })
      .catch(() => router.replace(loginHref))
      .finally(() => setChecking(false));
  }, [allowed, loginHref, requiredRole, router]);

  return !checking && allowed ? <>{children}</> : null;
}
