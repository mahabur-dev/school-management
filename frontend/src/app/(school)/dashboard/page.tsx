import type { Metadata } from 'next';
import { DashboardHome } from '@/features/dashboard/components/dashboard-home';

export const metadata: Metadata = {
  title: 'Dashboard | School SaaS',
  description: 'School operations overview and daily activity.',
};

export default function SchoolDashboardPage() {
  return <DashboardHome />;
}
