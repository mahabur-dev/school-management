'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { authApi, type ResolvedTenant } from '../api';
import { LoginScreen } from './login-screen';

export function TenantLoginPage() {
  const params = useParams<{ tenantSlug: string }>();
  const tenantSlug = Array.isArray(params.tenantSlug) ? params.tenantSlug[0] : params.tenantSlug;
  const [tenant, setTenant] = useState<ResolvedTenant | null>(null);
  const [resolved, setResolved] = useState(false);

  useEffect(() => {
    if (!tenantSlug) return;
    authApi.resolveTenant(tenantSlug)
      .then(setTenant)
      .catch(() => setTenant(null))
      .finally(() => setResolved(true));
  }, [tenantSlug]);

  if (!resolved) {
    return <main style={{ minHeight: '100svh', display: 'grid', placeItems: 'center', color: '#52647b', fontFamily: 'var(--font-sans)' }}>Checking school workspace…</main>;
  }

  if (!tenant) {
    return <main style={{ minHeight: '100svh', display: 'grid', placeItems: 'center', padding: 24, color: '#26364d', fontFamily: 'var(--font-sans)', textAlign: 'center' }}><div><strong style={{ display: 'block', fontSize: 20 }}>School workspace unavailable</strong><span style={{ display: 'block', marginTop: 8, color: '#68778d', fontSize: 14 }}>Check the workspace URL or contact your platform administrator.</span></div></main>;
  }

  return <LoginScreen mode="school" tenantName={tenant.name} tenantSlug={tenant.slug} />;
}
