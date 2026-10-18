import type { ReactNode } from 'react';
import {
  DashboardShell,
  type DashboardNavigationItem,
} from './school-dashboard-shell';

const platformNavigation: DashboardNavigationItem[] = [
  { label: 'Overview', icon: 'dashboard', active: true, href: '/super-admin' },
  { label: 'Schools', icon: 'building', href: '/super-admin/schools' },
  { label: 'Platform users', icon: 'people' },
  { label: 'Feature controls', icon: 'features', href: '/super-admin/features' },
  { label: 'System activity', icon: 'pulse' },
  { label: 'Announcements', icon: 'notice' },
];

export function SuperAdminDashboardShell({ children }: { children: ReactNode }) {
  return (
    <DashboardShell
      navigation={platformNavigation}
      navigationLabel="Platform"
      workspaceName="School SaaS"
      workspaceMeta="Platform administration"
      workspaceInitial="S"
      roleLabel="Super administrator"
      fallbackName="Platform Admin"
      helpTitle="Platform support"
      helpText="Operations & security centre"
      logoutHref="/super-admin/login"
    >
      {children}
    </DashboardShell>
  );
}
