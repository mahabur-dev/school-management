import type { Metadata } from 'next';
import { TenantLoginPage } from '@/features/auth/components/tenant-login-page';

export const metadata: Metadata = {
  title: 'School sign in | School SaaS',
  description: 'Secure access to your school workspace.',
};

export default function TenantLoginRoute() {
  return <TenantLoginPage />;
}
