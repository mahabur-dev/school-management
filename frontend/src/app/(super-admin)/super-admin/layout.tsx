import { SuperAdminDashboardShell } from '@/components/layout/super-admin-dashboard-shell';

export default function SuperAdminLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <SuperAdminDashboardShell>{children}</SuperAdminDashboardShell>;
}
