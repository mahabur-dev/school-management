import type { Metadata } from 'next';
import { TenantLoginPage } from '@/features/auth/components/tenant-login-page.server';

export const metadata: Metadata = {
  title: 'School sign in | School SaaS',
  description: 'Secure access to your school workspace.',
};

type TenantLoginRouteProps = {
  params: Promise<{ tenantSlug: string }>;
};

export default async function TenantLoginRoute({ params }: TenantLoginRouteProps) {
  const { tenantSlug } = await params;

  return <TenantLoginPage tenantSlug={tenantSlug} />;
}
