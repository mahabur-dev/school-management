import { SuperAdminDashboardShell } from '@/components/layout/super-admin-dashboard-shell';
import { RequireDashboardSession } from '@/components/auth/require-dashboard-session';

export default function SuperAdminLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <RequireDashboardSession requiredRole="SUPER_ADMIN" loginHref="/super-admin/login"><SuperAdminDashboardShell>{children}</SuperAdminDashboardShell></RequireDashboardSession>;
}
