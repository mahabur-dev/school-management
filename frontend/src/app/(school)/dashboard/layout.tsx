import { SchoolDashboardShell } from '@/components/layout/school-dashboard-shell';

export default function SchoolLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <SchoolDashboardShell>{children}</SchoolDashboardShell>;
}
