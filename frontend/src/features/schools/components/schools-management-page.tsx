'use client';

import { useEffect, useMemo, useState, type FormEvent } from 'react';
import { AppIcon } from '@/components/ui/app-icon';
import { ApiError } from '@/lib/api/error';
import { session } from '@/lib/auth/session';
import type { CreateSchoolResponse, School } from '@/types/school';
import { schoolsApi } from '../api';
import styles from './schools-management-page.module.css';

function toSlug(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 63);
}

export function SchoolsManagementPage() {
  const accessToken = session.get()?.accessToken;
  const [schools, setSchools] = useState<School[]>([]);
  const [loading, setLoading] = useState(Boolean(accessToken));
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState('');
  const [isCreateOpen, setCreateOpen] = useState(false);
  const [created, setCreated] = useState<CreateSchoolResponse | null>(null);
  const displayError = error ?? (!accessToken ? 'Your platform session has expired. Please sign in again.' : null);

  useEffect(() => {
    if (!created) return;
    const timer = window.setTimeout(() => setCreated(null), 4000);
    return () => window.clearTimeout(timer);
  }, [created]);

  useEffect(() => {
    if (!accessToken) return;
    schoolsApi
      .list(accessToken, '?page=1&limit=100')
      .then((response) => setSchools(response.items))
      .catch(() => setError('School workspaces could not be loaded.'))
      .finally(() => setLoading(false));
  }, [accessToken]);

  const visibleSchools = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    if (!normalized) return schools;
    return schools.filter((school) =>
      `${school.name} ${school.slug}`.toLowerCase().includes(normalized),
    );
  }, [query, schools]);

  function onCreated(school: School, response: CreateSchoolResponse) {
    setSchools((current) => [school, ...current]);
    setCreated(response);
    setCreateOpen(false);
  }

  return (
    <main className={styles.page}>
      <header className={styles.pageHeader}>
        <div>
          <span className={styles.eyebrow}>Tenant directory</span>
          <h1>Schools</h1>
          <p>Create and manage the school workspaces on your platform.</p>
        </div>
        <button className={styles.createButton} type="button" onClick={() => { setCreated(null); setCreateOpen(true); }}>
          <AppIcon name="plus" /> Create school
        </button>
      </header>

      {created ? (
        <section className={styles.createdNotice} aria-live="polite">
          <span><AppIcon name="check" /></span>
          <div><strong>{created.school.name} is ready for sign in.</strong><p>{created.invitationEmailSent ? 'A branded login invitation was sent to its administrator.' : 'Email delivery is not configured yet; share the login details securely.'} The dashboard URL is <code>/login/{created.school.slug}</code>.</p></div>
          <button type="button" onClick={() => setCreated(null)} aria-label="Dismiss confirmation"><AppIcon name="x" /></button>
        </section>
      ) : null}

      <section className={styles.tablePanel} aria-labelledby="school-directory-title">
        <div className={styles.tableTop}>
          <div><h2 id="school-directory-title">All school workspaces</h2><p>{schools.length} registered tenant{schools.length === 1 ? '' : 's'}</p></div>
          <label className={styles.search}><AppIcon name="search" /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search school or workspace ID" /></label>
        </div>

        {displayError ? <div className={styles.error} role="alert">{displayError}</div> : null}
        {loading ? <SchoolTableSkeleton /> : null}
        {!loading && !displayError ? (
          <div className={styles.tableWrap}>
            <table>
              <thead><tr><th>School</th><th>Workspace URL</th><th>Status</th><th>Created</th></tr></thead>
              <tbody>
                {visibleSchools.map((school) => (
                  <tr key={school.id}>
                    <td><span className={styles.initial}>{school.name.charAt(0)}</span><strong>{school.name}</strong></td>
                    <td><code>/login/{school.slug}</code></td>
                    <td><span className={school.status === 'ACTIVE' ? styles.active : styles.suspended}>{school.status === 'ACTIVE' ? 'Active' : 'Suspended'}</span></td>
                    <td>{new Intl.DateTimeFormat('en', { day: '2-digit', month: 'short', year: 'numeric' }).format(new Date(school.createdAt))}</td>
                  </tr>
                ))}
                {visibleSchools.length === 0 ? <tr><td colSpan={4} className={styles.empty}>No school workspace matches your search.</td></tr> : null}
              </tbody>
            </table>
          </div>
        ) : null}
      </section>

      {isCreateOpen && accessToken ? <CreateSchoolDialog accessToken={accessToken} onClose={() => setCreateOpen(false)} onCreated={onCreated} /> : null}
    </main>
  );
}

function SchoolTableSkeleton() {
  return (
    <div className={styles.skeletonTable} aria-label="Loading school workspaces" aria-busy="true">
      {Array.from({ length: 5 }, (_, index) => (
        <div className={styles.skeletonRow} key={index}>
          <span className={`${styles.skeleton} ${styles.skeletonAvatar}`} />
          <span className={`${styles.skeleton} ${styles.skeletonName}`} />
          <span className={`${styles.skeleton} ${styles.skeletonUrl}`} />
          <span className={`${styles.skeleton} ${styles.skeletonStatus}`} />
          <span className={`${styles.skeleton} ${styles.skeletonDate}`} />
        </div>
      ))}
    </div>
  );
}

function CreateSchoolDialog({ accessToken, onClose, onCreated }: { accessToken: string; onClose: () => void; onCreated: (school: School, response: CreateSchoolResponse) => void }) {
  const [name, setName] = useState('');
  const [slug, setSlug] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const workspaceSlug = slug || toSlug(name);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    if (!workspaceSlug || workspaceSlug.length < 3) {
      setError('Enter a school name or a workspace URL with at least 3 characters.');
      return;
    }
    setSubmitting(true);
    try {
      const response = await schoolsApi.create(accessToken, { name, slug: workspaceSlug, adminEmail: email, adminPassword: password });
      onCreated(response.school, response);
    } catch (caught) {
      setError(caught instanceof ApiError ? caught.message : 'School could not be created. Please try again.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className={styles.backdrop} role="presentation">
      <section className={styles.dialog} role="dialog" aria-modal="true" aria-labelledby="create-school-title">
        <header><div><span className={styles.eyebrow}>New tenant workspace</span><h2 id="create-school-title">Create school</h2><p>Set up a secure workspace and its first administrator.</p></div><button type="button" onClick={onClose} aria-label="Close"><AppIcon name="x" /></button></header>
        <form onSubmit={submit}>
          <label>School name<input value={name} onChange={(event) => setName(event.target.value)} placeholder="e.g. Greenfield Academy" autoComplete="organization" required disabled={submitting} /></label>
          <label>Workspace URL <small>Optional — generated from the school name if blank</small><div className={styles.urlInput}><input value={slug} onChange={(event) => setSlug(toSlug(event.target.value))} placeholder={toSlug(name) || 'greenfield-academy'} autoCapitalize="none" disabled={submitting} /></div></label>
          <label>Administrator email<input value={email} onChange={(event) => setEmail(event.target.value)} type="email" placeholder="admin@school.edu" autoComplete="email" required disabled={submitting} /></label>
          <label>Administrator password <small>At least 10 characters</small><input value={password} onChange={(event) => setPassword(event.target.value)} type="password" placeholder="Create a strong password" autoComplete="new-password" minLength={10} required disabled={submitting} /></label>
          {error ? <div className={styles.error} role="alert">{error}</div> : null}
          <footer><button type="button" className={styles.cancel} onClick={onClose} disabled={submitting}>Cancel</button><button type="submit" className={styles.submit} disabled={submitting}>{submitting ? 'Creating…' : 'Create school'}<AppIcon name="arrow-up-right" /></button></footer>
        </form>
      </section>
    </div>
  );
}
