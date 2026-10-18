import type { Metadata } from 'next';
import { LoginScreen } from '@/features/auth/components/login-screen';

export const metadata: Metadata = {
  title: 'Platform sign in | School SaaS',
  description: 'Secure sign in for School SaaS platform administrators.',
};

export default function SuperAdminLoginPage() {
  return <LoginScreen mode="platform" />;
}
