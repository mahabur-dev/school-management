import type { Metadata } from 'next';
import { SchoolsManagementPage } from '@/features/schools/components/schools-management-page';

export const metadata: Metadata = {
  title: 'Schools | School SaaS',
  description: 'Manage school workspaces and their administrators.',
};

export default function SchoolsPage() {
  return <SchoolsManagementPage />;
}
