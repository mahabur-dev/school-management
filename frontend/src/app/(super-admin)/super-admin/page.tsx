import type { Metadata } from 'next';
import { SuperAdminDashboardHome } from '@/features/super-admin-dashboard/components/super-admin-dashboard-home';

export const metadata: Metadata = {
  title: 'Platform overview | School SaaS',
  description: 'Super admin overview for the School SaaS platform.',
};

export default function SuperAdminDashboardPage() {
  return <SuperAdminDashboardHome />;
}
