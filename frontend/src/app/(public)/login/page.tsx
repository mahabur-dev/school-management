import type { Metadata } from 'next';
import { LoginScreen } from '@/features/auth/components/login-screen';

export const metadata: Metadata = {
  title: 'Sign in | School SaaS',
  description: 'Secure access to your school management workspace.',
};

export default function LoginPage() {
  return (
    <LoginScreen
      mode="school"
      tenantName={process.env.NEXT_PUBLIC_TENANT_NAME ?? 'Greenfield Academy'}
      tenantSlug={process.env.NEXT_PUBLIC_TENANT_SLUG}
    />
  );
}
