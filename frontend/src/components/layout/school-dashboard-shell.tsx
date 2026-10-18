"use client";

import { useEffect, useState, type ReactNode } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { AppIcon, type AppIconName } from "@/components/ui/app-icon";
import { authApi } from "@/features/auth/api";
import { featuresApi } from "@/features/features/api";
import { session } from "@/lib/auth/session";
import styles from "./school-dashboard-shell.module.css";

export type DashboardNavigationItem = {
  label: string;
  icon: AppIconName;
  active?: boolean;
  href?: string;
  children?: DashboardNavigationItem[];
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
  logoutHref: "/login" | "/super-admin/login";
};

const schoolNavigation: DashboardNavigationItem[] = [
  { label: "Dashboard", icon: "dashboard", href: "/dashboard" },
  { label: "Students", icon: "student", href: "/dashboard/students" },
  { label: "Finance", icon: "finance", href: "/dashboard/finance" },
  { label: "Teachers", icon: "teacher" },
  { label: "Staff", icon: "staff" },
  { label: "Attendance", icon: "calendar" },
  { label: "Classes", icon: "book" },
  { label: "Exams", icon: "exam" },
  { label: "Notices", icon: "notice" },
];

export function SchoolDashboardShell({ children }: { children: ReactNode }) {
  const token = session.get()?.accessToken;
  const [financeEnabled, setFinanceEnabled] = useState(false);
  useEffect(() => {
    if (!token) return;
    featuresApi
      .mine(token)
      .then((features) =>
        setFinanceEnabled(
          features.some((feature) => feature.key === "fee_management"),
        ),
      )
      .catch(() => setFinanceEnabled(false));
  }, [token]);
  return (
    <DashboardShell
      navigation={schoolNavigation.filter(
        (item) => item.label !== "Finance" || financeEnabled,
      )}
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
  const [navigationExpansion, setNavigationExpansion] = useState<
    Record<string, boolean>
  >({});
  const user = session.get()?.user;
  const displayName = user
    ? `${user.firstName} ${user.lastName}`
    : fallbackName;
  const initials = user
    ? `${user.firstName.charAt(0)}${user.lastName.charAt(0)}`.toUpperCase()
    : "SA";
  const effectiveWorkspaceName = user?.school?.name ?? workspaceName;
  const effectiveWorkspaceInitial =
    user?.school?.name.charAt(0) ?? workspaceInitial;

  function toggleNavigationGroup(label: string, expanded: boolean) {
    setNavigationExpansion((current) => ({
      ...current,
      [label]: !expanded,
    }));
  }

  function returnToPlatform() {
    if (!session.restorePlatform()) return;
    router.replace("/super-admin");
  }

  async function logout() {
    const activeSession = session.get();
    setLoggingOut(true);
    session.clear();
    if (activeSession)
      await authApi.logout(activeSession.accessToken).catch(() => undefined);
    router.replace(logoutHref);
  }

  function openProfile() {
    setProfileOpen(false);
    router.push(
      user?.role === "SUPER_ADMIN"
        ? "/super-admin/profile"
        : "/dashboard/profile",
    );
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

      <aside
        className={`${styles.sidebar} ${menuOpen ? styles.sidebarOpen : ""}`}
      >
        <div className={styles.sidebarTop}>
          <Brand
            href={user?.role === "SUPER_ADMIN" ? "/super-admin" : "/dashboard"}
          />
          <button
            type="button"
            className={styles.closeMenu}
            aria-label="Close navigation"
            onClick={() => setMenuOpen(false)}
          >
            <AppIcon name="x" />
          </button>
        </div>

        <nav
          className={styles.navigation}
          aria-label={`${effectiveWorkspaceName} navigation`}
        >
          <span className={styles.navLabel}>{navigationLabel}</span>
          {navigation.map((item) => {
            if (item.children?.length) {
              const childActive = item.children.some(
                (child) => child.href === pathname,
              );
              const expanded =
                navigationExpansion[item.label] ?? childActive;
              return (
                <div className={styles.navGroup} key={item.label}>
                  <button
                    type="button"
                    className={`${styles.navItem} ${styles.navGroupToggle} ${childActive ? styles.navActive : ""}`}
                    aria-expanded={expanded}
                    onClick={() =>
                      toggleNavigationGroup(item.label, expanded)
                    }
                  >
                    <AppIcon name={item.icon} />
                    <span>{item.label}</span>
                    <AppIcon
                      className={`${styles.navChevron} ${expanded ? styles.navChevronOpen : ""}`}
                      name="chevron-down"
                    />
                  </button>
                  {expanded ? (
                    <div
                      className={styles.subNavigation}
                      aria-label={`${item.label} modules`}
                    >
                      {item.children.map((child) => {
                        const isChildActive = child.href === pathname;
                        return child.href ? (
                          <Link
                            key={child.label}
                            href={child.href}
                            className={`${styles.subNavItem} ${isChildActive ? styles.subNavActive : ""}`}
                            aria-current={isChildActive ? "page" : undefined}
                          >
                            <AppIcon name={child.icon} />
                            <span>{child.label}</span>
                            {isChildActive ? (
                              <span className={styles.activeDot} />
                            ) : null}
                          </Link>
                        ) : null;
                      })}
                    </div>
                  ) : null}
                </div>
              );
            }
            const isActive = item.href ? pathname === item.href : item.active;
            const content = (
              <>
                <AppIcon name={item.icon} />
                <span>{item.label}</span>
                {isActive ? <span className={styles.activeDot} /> : null}
              </>
            );
            const className = `${styles.navItem} ${isActive ? styles.navActive : ""}`;
            return item.href ? (
              <Link key={item.label} href={item.href} className={className}>
                {content}
              </Link>
            ) : (
              <button
                key={item.label}
                type="button"
                className={className}
                disabled
                title={`${item.label} module coming next`}
              >
                {content}
              </button>
            );
          })}
        </nav>

        <div className={styles.sidebarBottom}>
          <button
            type="button"
            className={styles.navItem}
            disabled
            title="Settings module coming next"
          >
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
              <span className={styles.schoolCrest}>
                {effectiveWorkspaceInitial}
              </span>
              <span>
                <strong>{effectiveWorkspaceName}</strong>
                <small>{workspaceMeta}</small>
              </span>
            </div>
          </div>

          <div className={styles.topbarRight}>
            {session.hasPlatformSession() ? (
              <button
                type="button"
                className={styles.returnButton}
                onClick={returnToPlatform}
              >
                Return to platform
              </button>
            ) : null}
            <button
              type="button"
              className={styles.iconButton}
              aria-label="Notifications"
            >
              <AppIcon name="bell" />
              <span className={styles.notificationDot} />
            </button>
            <div className={styles.profileMenu}>
              <button
                type="button"
                className={styles.profile}
                aria-haspopup="menu"
                aria-expanded={profileOpen}
                onClick={() => setProfileOpen((value) => !value)}
              >
                <span className={styles.avatar}>{initials}</span>
                <span className={styles.profileCopy}>
                  <strong>{displayName}</strong>
                  <small>{roleLabel}</small>
                </span>
                <AppIcon name="chevron-down" />
              </button>
              {profileOpen ? (
                <div className={styles.profileDropdown} role="menu">
                  <button type="button" role="menuitem" onClick={openProfile}>
                    <AppIcon name="people" />
                    <span>Profile</span>
                  </button>
                  <span className={styles.menuDivider} />
                  <button
                    type="button"
                    role="menuitem"
                    className={styles.logoutItem}
                    onClick={logout}
                    disabled={isLoggingOut}
                  >
                    <AppIcon name="logout" />
                    <span>{isLoggingOut ? "Logging out…" : "Log out"}</span>
                  </button>
                </div>
              ) : null}
            </div>
          </div>
        </header>

        <div className={styles.content}>{children}</div>
      </div>
    </div>
  );
}

function Brand({ href }: { href: string }) {
  return (
    <Link aria-label="Go to dashboard" className={styles.brand} href={href}>
      <span className={styles.brandMark} aria-hidden="true">
        <span />
        <span />
        <span />
      </span>
      <span>
        <strong>School</strong>SaaS
      </span>
    </Link>
  );
}
