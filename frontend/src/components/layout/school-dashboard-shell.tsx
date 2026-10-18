'use client';

import { useState, type ReactNode } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { AppIcon, type AppIconName } from '@/components/ui/app-icon';
import { authApi } from '@/features/auth/api';
import { session } from '@/lib/auth/session';
import styles from './school-dashboard-shell.module.css';

export type DashboardNavigationItem = {
  label: string;
  icon: AppIconName;
  active?: boolean;
  href?: string;
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
  logoutHref: '/login' | '/super-admin/login';
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
      logoutHref="/login"
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
  logoutHref,
}: DashboardShellProps) {
  const router = useRouter();
  const pathname = usePathname();
  const [menuOpen, setMenuOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [isLoggingOut, setLoggingOut] = useState(false);
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

  async function logout() {
    const activeSession = session.get();
    setLoggingOut(true);
    session.clear();
    if (activeSession) await authApi.logout(activeSession.accessToken).catch(() => undefined);
    router.replace(logoutHref);
  }

  function openProfile() {
    setProfileOpen(false);
    router.push(user?.role === 'SUPER_ADMIN' ? '/super-admin/profile' : '/dashboard/profile');
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
          {navigation.map((item) => {
            const isActive = item.href ? pathname === item.href : item.active;
            const content = <><AppIcon name={item.icon} /><span>{item.label}</span>{isActive ? <span className={styles.activeDot} /> : null}</>;
            const className = `${styles.navItem} ${isActive ? styles.navActive : ''}`;
            return item.href ? (
              <Link key={item.label} href={item.href} className={className}>{content}</Link>
            ) : (
              <button key={item.label} type="button" className={className} disabled title={`${item.label} module coming next`}>
                {content}
              </button>
            );
          })}
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
            {session.hasPlatformSession() ? (
              <button type="button" className={styles.returnButton} onClick={returnToPlatform}>
                Return to platform
              </button>
            ) : null}
            <button type="button" className={styles.iconButton} aria-label="Notifications">
              <AppIcon name="bell" />
              <span className={styles.notificationDot} />
            </button>
            <div className={styles.profileMenu}>
              <button type="button" className={styles.profile} aria-haspopup="menu" aria-expanded={profileOpen} onClick={() => setProfileOpen((value) => !value)}>
                <span className={styles.avatar}>{initials}</span>
                <span className={styles.profileCopy}>
                  <strong>{displayName}</strong>
                  <small>{roleLabel}</small>
                </span>
                <AppIcon name="chevron-down" />
              </button>
              {profileOpen ? <div className={styles.profileDropdown} role="menu">
                <button type="button" role="menuitem" onClick={openProfile}><AppIcon name="people" /><span>Profile</span></button>
                <span className={styles.menuDivider} />
                <button type="button" role="menuitem" className={styles.logoutItem} onClick={logout} disabled={isLoggingOut}><AppIcon name="logout" /><span>{isLoggingOut ? 'Logging out…' : 'Log out'}</span></button>
              </div> : null}
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
