'use client';

import { AppIcon } from '@/components/ui/app-icon';
import { session } from '@/lib/auth/session';
import styles from './profile-page.module.css';

export function ProfilePage() {
  const user = session.get()?.user;
  const fullName = user ? `${user.firstName} ${user.lastName}` : 'Account';
  const initials = user ? `${user.firstName[0]}${user.lastName[0]}`.toUpperCase() : 'A';
  const isPlatform = user?.role === 'SUPER_ADMIN';

  return <main className={styles.page}>
    <header><span className={styles.eyebrow}>Account settings</span><h1>Profile</h1><p>Review your account and workspace access details.</p></header>
    <section className={styles.profileCard}>
      <div className={styles.identity}><span className={styles.avatar}>{initials}</span><div><h2>{fullName}</h2><p>{isPlatform ? 'Platform administrator' : 'School administrator'}</p></div></div>
      <div className={styles.details}>
        <div><span>Email address</span><strong>{user?.email ?? 'Unavailable'}</strong></div>
        <div><span>Access role</span><strong>{isPlatform ? 'Super Admin' : 'School Admin'}</strong></div>
        <div><span>Workspace</span><strong>{isPlatform ? 'School SaaS platform' : user?.school?.name ?? 'School workspace'}</strong></div>
      </div>
      <div className={styles.security}><AppIcon name="check" /><span>Your account is protected by role-based access controls.</span></div>
    </section>
  </main>;
}
