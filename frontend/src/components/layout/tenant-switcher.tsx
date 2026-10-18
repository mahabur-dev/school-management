'use client';

import { useEffect, useMemo, useState, type FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import { AppIcon } from '@/components/ui/app-icon';
import { authApi } from '@/features/auth/api';
import { schoolsApi } from '@/features/schools/api';
import { ApiError } from '@/lib/api/error';
import { session } from '@/lib/auth/session';
import type { School } from '@/types/school';
import styles from './tenant-switcher.module.css';

export function TenantSwitcher() {
  const router = useRouter();
  const platformAccessToken = session.get()?.accessToken;
  const [open, setOpen] = useState(false);
  const [schools, setSchools] = useState<School[]>([]);
  const [selectedSchool, setSelectedSchool] = useState<School | null>(null);
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(Boolean(platformAccessToken));
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!platformAccessToken) return;

    schoolsApi
      .list(platformAccessToken, '?page=1&limit=100&status=ACTIVE')
      .then((response) => setSchools(response.items))
      .catch(() => setError('School workspaces could not be loaded.'))
      .finally(() => setLoading(false));
  }, [platformAccessToken]);

  const visibleSchools = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    if (!normalized) return schools;
    return schools.filter(
      (school) =>
        school.name.toLowerCase().includes(normalized) ||
        school.slug.toLowerCase().includes(normalized),
    );
  }, [query, schools]);

  async function enterSchool(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!selectedSchool) return;
    setError(null);
    setSubmitting(true);
    const form = new FormData(event.currentTarget);

    try {
      const tenantSession = await authApi.login({
        email: String(form.get('email') ?? ''),
        password: String(form.get('password') ?? ''),
        portal: 'SCHOOL',
        tenantSlug: selectedSchool.slug,
      });

      if (tenantSession.user.school?.id !== selectedSchool.id) {
        await authApi.logout(tenantSession.accessToken).catch(() => undefined);
        throw new Error('These credentials do not belong to the selected school.');
      }

      session.enterTenant(tenantSession);
      router.replace('/dashboard');
    } catch (caught) {
      setError(
        caught instanceof ApiError || caught instanceof Error
          ? caught.message
          : 'Unable to enter this school workspace.',
      );
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className={styles.switcher}>
      <button
        type="button"
        className={styles.trigger}
        aria-haspopup="listbox"
        aria-expanded={open}
        onClick={() => setOpen((value) => !value)}
      >
        <span className={styles.triggerIcon}><AppIcon name="building" /></span>
        <span><small>Switch workspace</small><strong>{schools[0]?.name ?? 'Select school'}</strong></span>
        <AppIcon name="chevron-down" />
      </button>

      {open ? (
        <div className={styles.menu} role="listbox" aria-label="School workspaces">
          <header><span><strong>School workspaces</strong><small>Re-authentication is required</small></span><button type="button" onClick={() => setOpen(false)} aria-label="Close"><AppIcon name="x" /></button></header>
          <label className={styles.filter}><AppIcon name="search" /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search school" autoFocus /></label>
          <div className={styles.schoolList}>
            {loading ? <p>Loading schools…</p> : null}
            {!loading && visibleSchools.length === 0 ? <p>No active schools found.</p> : null}
            {visibleSchools.map((school) => (
              <button key={school.id} type="button" role="option" aria-selected="false" onClick={() => { setSelectedSchool(school); setOpen(false); setError(null); }}>
                <span className={styles.schoolInitial}>{school.name.charAt(0)}</span>
                <span><strong>{school.name}</strong><small>{school.slug}</small></span>
                <AppIcon name="arrow-up-right" />
              </button>
            ))}
          </div>
        </div>
      ) : null}

      {selectedSchool ? (
        <div className={styles.modalBackdrop} role="presentation">
          <section className={styles.modal} role="dialog" aria-modal="true" aria-labelledby="tenant-login-title">
            <div className={styles.modalTop}>
              <span className={styles.modalSchool}>{selectedSchool.name.charAt(0)}</span>
              <button type="button" onClick={() => setSelectedSchool(null)} aria-label="Close"><AppIcon name="x" /></button>
            </div>
            <span className={styles.modalEyebrow}>Enter school workspace</span>
            <h2 id="tenant-login-title">{selectedSchool.name}</h2>
            <p>Use an administrator account belonging to this tenant. Your platform session will remain available.</p>
            <form onSubmit={enterSchool}>
              <label>Email address<input name="email" type="email" autoComplete="email" placeholder="admin@school.edu" required disabled={submitting} /></label>
              <label>Password<input name="password" type="password" autoComplete="current-password" placeholder="Enter tenant password" required disabled={submitting} /></label>
              {error ? <div className={styles.modalError} role="alert">{error}</div> : null}
              <button type="submit" className={styles.continueButton} disabled={submitting}>{submitting ? 'Verifying…' : 'Continue to school'}<AppIcon name="arrow-up-right" /></button>
            </form>
            <small className={styles.auditNote}>This access is tenant-scoped and should be audit logged.</small>
          </section>
        </div>
      ) : null}
    </div>
  );
}
