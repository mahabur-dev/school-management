import { SchoolDashboardShell } from '@/components/layout/school-dashboard-shell';
import { RequireDashboardSession } from '@/components/auth/require-dashboard-session';

export default function SchoolLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <RequireDashboardSession requiredRole="SCHOOL_ADMIN" loginHref="/login"><SchoolDashboardShell>{children}</SchoolDashboardShell></RequireDashboardSession>;
}
