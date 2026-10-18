'use client';

import { useState, type ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import { AppIcon, type AppIconName } from '@/components/ui/app-icon';
import { TenantSwitcher } from './tenant-switcher';
import { session } from '@/lib/auth/session';
import styles from './school-dashboard-shell.module.css';

export type DashboardNavigationItem = {
  label: string;
  icon: AppIconName;
  active?: boolean;
};

type DashboardShellProps = {
  children: ReactNode;
  navigation: DashboardNavigationItem[];
  navigationLabel: string;
  workspaceName: string;
  workspaceMeta: string;
  workspaceInitial: string;
  roleLabel: string;
  fallbackName: string;
  helpTitle: string;
  helpText: string;
  allowTenantSwitch?: boolean;
};

const schoolNavigation: DashboardNavigationItem[] = [
  { label: 'Dashboard', icon: 'dashboard', active: true },
  { label: 'Students', icon: 'student' },
  { label: 'Teachers', icon: 'teacher' },
  { label: 'Staff', icon: 'staff' },
  { label: 'Attendance', icon: 'calendar' },
  { label: 'Classes', icon: 'book' },
  { label: 'Exams', icon: 'exam' },
  { label: 'Notices', icon: 'notice' },
];

export function SchoolDashboardShell({ children }: { children: ReactNode }) {
  return (
    <DashboardShell
      navigation={schoolNavigation}
      navigationLabel="Workspace"
      workspaceName="Greenfield Academy"
      workspaceMeta="School workspace"
      workspaceInitial="G"
      roleLabel="Administrator"
      fallbackName="School Admin"
      helpTitle="Need help?"
      helpText="Contact platform support"
    >
      {children}
    </DashboardShell>
  );
}

export function DashboardShell({
  children,
  navigation,
  navigationLabel,
  workspaceName,
  workspaceMeta,
  workspaceInitial,
  roleLabel,
  fallbackName,
  helpTitle,
  helpText,
  allowTenantSwitch = false,
}: DashboardShellProps) {
  const router = useRouter();
  const [menuOpen, setMenuOpen] = useState(false);
  const user = session.get()?.user;
  const displayName = user ? `${user.firstName} ${user.lastName}` : fallbackName;
  const initials = user
    ? `${user.firstName.charAt(0)}${user.lastName.charAt(0)}`.toUpperCase()
    : 'SA';
  const effectiveWorkspaceName = user?.school?.name ?? workspaceName;
  const effectiveWorkspaceInitial = user?.school?.name.charAt(0) ?? workspaceInitial;

  function returnToPlatform() {
    if (!session.restorePlatform()) return;
    router.replace('/super-admin');
  }

  return (
    <div className={styles.appShell}>
      {menuOpen ? (
        <button
          type="button"
          className={styles.backdrop}
          aria-label="Close navigation"
          onClick={() => setMenuOpen(false)}
        />
      ) : null}

      <aside className={`${styles.sidebar} ${menuOpen ? styles.sidebarOpen : ''}`}>
        <div className={styles.sidebarTop}>
          <Brand />
          <button
            type="button"
            className={styles.closeMenu}
            aria-label="Close navigation"
            onClick={() => setMenuOpen(false)}
          >
            <AppIcon name="x" />
          </button>
        </div>

        <nav className={styles.navigation} aria-label={`${effectiveWorkspaceName} navigation`}>
          <span className={styles.navLabel}>{navigationLabel}</span>
          {navigation.map((item) => (
            <button
              key={item.label}
              type="button"
              className={`${styles.navItem} ${item.active ? styles.navActive : ''}`}
              disabled={!item.active}
              title={item.active ? undefined : `${item.label} module coming next`}
            >
              <AppIcon name={item.icon} />
              <span>{item.label}</span>
              {item.active ? <span className={styles.activeDot} /> : null}
            </button>
          ))}
        </nav>

        <div className={styles.sidebarBottom}>
          <button type="button" className={styles.navItem} disabled title="Settings module coming next">
            <AppIcon name="settings" />
            <span>Settings</span>
          </button>
          <div className={styles.helpCard}>
            <span className={styles.helpIcon}>?</span>
            <div>
              <strong>{helpTitle}</strong>
              <small>{helpText}</small>
            </div>
          </div>
        </div>
      </aside>

      <div className={styles.workspace}>
        <header className={styles.topbar}>
          <div className={styles.topbarLeft}>
            <button
              type="button"
              className={styles.menuButton}
              aria-label="Open navigation"
              aria-expanded={menuOpen}
              onClick={() => setMenuOpen(true)}
            >
              <AppIcon name="menu" />
            </button>
            <div className={styles.schoolIdentity}>
              <span className={styles.schoolCrest}>{effectiveWorkspaceInitial}</span>
              <span>
                <strong>{effectiveWorkspaceName}</strong>
                <small>{workspaceMeta}</small>
              </span>
              <AppIcon name="chevron-down" />
            </div>
          </div>

          <div className={styles.topbarRight}>
            {allowTenantSwitch ? <TenantSwitcher /> : null}
            {!allowTenantSwitch && session.hasPlatformSession() ? (
              <button type="button" className={styles.returnButton} onClick={returnToPlatform}>
                Return to platform
              </button>
            ) : null}
            <label className={styles.search}>
              <AppIcon name="search" />
              <input type="search" placeholder="Search anything" aria-label="Search workspace" />
              <kbd>⌘ K</kbd>
            </label>
            <button type="button" className={styles.iconButton} aria-label="Notifications">
              <AppIcon name="bell" />
              <span className={styles.notificationDot} />
            </button>
            <div className={styles.profile}>
              <span className={styles.avatar}>{initials}</span>
              <span className={styles.profileCopy}>
                <strong>{displayName}</strong>
                <small>{roleLabel}</small>
              </span>
              <AppIcon name="chevron-down" />
            </div>
          </div>
        </header>

        <div className={styles.content}>{children}</div>
      </div>
    </div>
  );
}

function Brand() {
  return (
    <div className={styles.brand}>
      <span className={styles.brandMark} aria-hidden="true">
        <span /><span /><span />
      </span>
      <span><strong>School</strong>SaaS</span>
    </div>
  );
}
