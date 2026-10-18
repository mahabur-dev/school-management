'use client';

import { useState, type FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import { ApiError } from '@/lib/api/error';
import { session } from '@/lib/auth/session';
import { authApi, type ResolvedTenant } from '../api';
import styles from './login-screen.module.css';

type LoginScreenProps = {
  mode: 'platform' | 'school';
  tenantName?: string;
  tenantSlug?: string;
};

export function LoginScreen({ mode, tenantName, tenantSlug }: LoginScreenProps) {
  const router = useRouter();
  const initialTenant =
    mode === 'school' && tenantSlug
      ? { id: '', name: tenantName ?? tenantSlug, slug: tenantSlug }
      : null;
  const [tenant, setTenant] = useState<ResolvedTenant | null>(initialTenant);
  const [selectingTenant, setSelectingTenant] = useState(false);
  const [tenantQuery, setTenantQuery] = useState('');
  const [isResolvingTenant, setIsResolvingTenant] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const canSwitchTenant = mode === 'platform';
  const isTenantLogin = mode === 'school' || tenant !== null;
  const activePortal = isTenantLogin ? 'SCHOOL' : 'PLATFORM';
  const story = isTenantLogin
    ? {
        eyebrow: 'Secure school operations',
        title: <>One workspace.<br />Your school in sync.</>,
        description: 'Manage people, academics and daily operations from one secure, tenant-protected workspace.',
        overview: "Today’s overview",
        status: 'Operations are on track',
        firstMetric: ['Students', '1,738', '+8.4% this term'],
        secondMetric: ['Attendance', '94.2%', 'Across all classes'],
        insight: 'Live insight',
        insightDetail: 'School activity updates in real time',
        trend: '+12%',
        trust: 'Tenant protected',
      }
    : {
        eyebrow: 'Secure platform control',
        title: <>Every school.<br />One control centre.</>,
        description: 'Monitor tenant health, access and feature adoption from one secure platform workspace.',
        overview: 'Platform overview',
        status: 'All systems performing well',
        firstMetric: ['Active schools', '128', '+6 this month'],
        secondMetric: ['Platform health', '99.98%', 'Last 30 days'],
        insight: 'Growth pulse',
        insightDetail: 'Tenant activity is trending upward',
        trend: '+18%',
        trust: 'Audit ready',
      };

  async function resolveTenant(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setIsResolvingTenant(true);

    try {
      const resolved = await authApi.resolveTenant(tenantQuery);
      setTenant(resolved);
      setSelectingTenant(false);
      setTenantQuery('');
    } catch (caught) {
      setError(
        caught instanceof ApiError
          ? caught.message
          : 'We could not find that school workspace.',
      );
    } finally {
      setIsResolvingTenant(false);
    }
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setIsSubmitting(true);

    const form = new FormData(event.currentTarget);

    try {
      const authSession = await authApi.login({
        email: String(form.get('email') ?? ''),
        password: String(form.get('password') ?? ''),
        rememberMe: form.get('rememberMe') === 'on',
        portal: activePortal,
        ...(isTenantLogin && tenant ? { tenantSlug: tenant.slug } : {}),
      });

      const expectedRole = activePortal === 'PLATFORM' ? 'SUPER_ADMIN' : 'SCHOOL_ADMIN';
      if (authSession.user.role !== expectedRole) {
        await authApi.logout(authSession.accessToken).catch(() => undefined);
        setError(
          activePortal === 'PLATFORM'
            ? 'This account does not have platform administrator access.'
            : 'This account cannot access the selected school workspace.',
        );
        return;
      }

      session.set(authSession);
      router.replace(activePortal === 'PLATFORM' ? '/super-admin' : '/dashboard');
    } catch (caught) {
      setError(
        caught instanceof ApiError
          ? caught.message
          : 'We could not sign you in. Please try again.',
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <main className={styles.page}>
      <div className={styles.orbOne} aria-hidden="true" />
      <div className={styles.orbTwo} aria-hidden="true" />

      <section className={styles.shell} aria-label={`${mode === 'platform' ? 'Platform' : 'School'} sign in`}>
        <aside className={styles.storyPanel}>
          <Brand light />

          <div className={styles.storyContent}>
            <span className={styles.eyebrow}>
              <ShieldCheckIcon />
              {story.eyebrow}
            </span>
            <h1>{story.title}</h1>
            <p>{story.description}</p>

            <div className={styles.previewCard} aria-hidden="true">
              <div className={styles.previewTop}>
                <div>
                  <span>{story.overview}</span>
                  <strong>{story.status}</strong>
                </div>
                <span className={styles.livePill}>Live</span>
              </div>
              <div className={styles.metrics}>
                <div className={styles.metricAmber}>
                  <span>{story.firstMetric[0]}</span>
                  <strong>{story.firstMetric[1]}</strong>
                  <small>{story.firstMetric[2]}</small>
                </div>
                <div className={styles.metricWhite}>
                  <span>{story.secondMetric[0]}</span>
                  <strong>{story.secondMetric[1]}</strong>
                  <small>{story.secondMetric[2]}</small>
                </div>
              </div>
              <div className={styles.activityRow}>
                <span className={styles.activityIcon}><ChartIcon /></span>
                <span>
                  <strong>{story.insight}</strong>
                  <small>{story.insightDetail}</small>
                </span>
                <span className={styles.activityTrend}>{story.trend}</span>
              </div>
            </div>
          </div>

          <div className={styles.trustLine}>
            <span><CheckIcon /> Role-based access</span>
            <span><CheckIcon /> {story.trust}</span>
          </div>
        </aside>

        <div className={styles.formPanel}>
          <div className={styles.mobileBrand}><Brand /></div>

          {canSwitchTenant ? <button
            type="button"
            className={`${styles.portalContext} ${styles.portalContextSwitch}`}
            onClick={() => {
              setSelectingTenant(true);
              setError(null);
            }}
            aria-label="Switch school workspace"
          >
            <span className={styles.contextIcon}>{tenant?.name.charAt(0) ?? 'P'}</span>
            <span>
              <small>{tenant ? 'School workspace' : 'Access portal'}</small>
              <strong>{tenant?.name ?? 'Super Admin'}</strong>
            </span>
            <span className={styles.switchLabel}>Switch</span>
          </button> : <div className={styles.portalContext}>
            <span className={styles.contextIcon}>{tenant?.name.charAt(0) ?? 'S'}</span>
            <span>
              <small>School workspace</small>
              <strong>{tenant?.name ?? 'Your school'}</strong>
            </span>
            <ShieldCheckIcon />
          </div>}

          <div className={styles.formWrap}>
            {canSwitchTenant && selectingTenant ? (
              <form className={styles.tenantForm} onSubmit={resolveTenant} noValidate>
                <span className={styles.welcomeMark}>School workspace</span>
                <h2>Find your school</h2>
                <p>Enter your school name to continue. Matching administrator credentials are required for access.</p>
                <label htmlFor="tenantSlug">School name</label>
                <div className={styles.tenantInputWrap}>
                  <input
                    id="tenantSlug"
                    value={tenantQuery}
                    onChange={(event) => setTenantQuery(event.target.value)}
                    placeholder="Type your school name"
                    autoCapitalize="none"
                    autoComplete="organization"
                    required
                    disabled={isResolvingTenant}
                  />
                </div>
                {error ? <div className={styles.error} role="alert"><AlertIcon /><span>{error}</span></div> : null}
                <button className={styles.submit} type="submit" disabled={isResolvingTenant}>
                  <span>{isResolvingTenant ? 'Checking workspace…' : 'Continue'}</span>
                  {isResolvingTenant ? <span className={styles.spinner} /> : <ArrowIcon />}
                </button>
                {tenant ? (
                  <button className={styles.backButton} type="button" onClick={() => { setSelectingTenant(false); setError(null); }}>
                    Back to {tenant.name}
                  </button>
                ) : null}
              </form>
            ) : <>
            <div className={styles.formHeading}>
              <span className={styles.welcomeMark}>{isTenantLogin ? 'Welcome back' : 'Platform access'}</span>
              <h2>{isTenantLogin ? 'Sign in to your school' : 'Sign in as Super Admin'}</h2>
              <p>{isTenantLogin ? `Continue securely to ${tenant?.name ?? 'your school workspace'}.` : 'Only authorised platform administrators can continue.'}</p>
            </div>

            <form className={styles.form} onSubmit={handleSubmit} noValidate>
              <div className={styles.field}>
                <label htmlFor="email">Email address</label>
                <div className={styles.inputWrap}>
                  <span className={styles.inputIcon}><MailIcon /></span>
                  <input
                    id="email"
                    name="email"
                    type="email"
                    autoComplete="email"
                    placeholder={isTenantLogin ? 'admin@school.edu' : 'admin@schoolsaas.com'}
                    required
                    disabled={isSubmitting}
                  />
                </div>
              </div>

              <div className={styles.field}>
                <label htmlFor="password">Password</label>
                <div className={styles.inputWrap}>
                  <span className={styles.inputIcon}><LockIcon /></span>
                  <input
                    id="password"
                    name="password"
                    type={showPassword ? 'text' : 'password'}
                    autoComplete="current-password"
                    placeholder="Enter your password"
                    required
                    disabled={isSubmitting}
                  />
                  <button
                    className={styles.passwordToggle}
                    type="button"
                    onClick={() => setShowPassword((value) => !value)}
                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                    aria-pressed={showPassword}
                  >
                    {showPassword ? <EyeOffIcon /> : <EyeIcon />}
                  </button>
                </div>
              </div>

              <label className={styles.remember}>
                <input name="rememberMe" type="checkbox" disabled={isSubmitting} />
                <span className={styles.checkbox} aria-hidden="true"><CheckIcon /></span>
                Keep me signed in on this device
              </label>

              {error ? (
                <div className={styles.error} role="alert">
                  <AlertIcon />
                  <span>{error}</span>
                </div>
              ) : null}

              <button className={styles.submit} type="submit" disabled={isSubmitting}>
                <span>{isSubmitting ? 'Signing in…' : 'Sign in securely'}</span>
                {isSubmitting ? <span className={styles.spinner} /> : <ArrowIcon />}
              </button>
            </form>

            <div className={styles.support}>
              <HeadsetIcon />
              <span>{isTenantLogin ? 'Need access help? Contact your school administrator.' : 'Need platform access? Contact the security owner.'}</span>
            </div>
            </>}
          </div>

          <footer className={styles.footer}>
            <span>© {new Date().getFullYear()} School SaaS</span>
            <span className={styles.secured}><LockIcon /> Secure access</span>
          </footer>
        </div>
      </section>
    </main>
  );
}

function Brand({ light = false }: { light?: boolean }) {
  return (
    <div className={`${styles.brand} ${light ? styles.brandLight : ''}`}>
      <span className={styles.brandMark} aria-hidden="true">
        <span />
        <span />
        <span />
      </span>
      <span>
        <strong>School</strong>SaaS
      </span>
    </div>
  );
}

function MailIcon() {
  return <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 6.5h16v11H4z"/><path d="m4.5 7 7.5 6 7.5-6"/></svg>;
}

function LockIcon() {
  return <svg viewBox="0 0 24 24" aria-hidden="true"><rect x="5" y="10" width="14" height="10" rx="2"/><path d="M8.5 10V7.5a3.5 3.5 0 0 1 7 0V10"/></svg>;
}

function EyeIcon() {
  return <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M2.5 12s3.5-6 9.5-6 9.5 6 9.5 6-3.5 6-9.5 6-9.5-6-9.5-6Z"/><circle cx="12" cy="12" r="2.5"/></svg>;
}

function EyeOffIcon() {
  return <svg viewBox="0 0 24 24" aria-hidden="true"><path d="m4 4 16 16"/><path d="M10.7 6.1A10.6 10.6 0 0 1 12 6c6 0 9.5 6 9.5 6a15.7 15.7 0 0 1-2.3 3.1M7.2 7.2C4.2 9 2.5 12 2.5 12s3.5 6 9.5 6a9.8 9.8 0 0 0 3-.5"/></svg>;
}

function ArrowIcon() {
  return <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 12h14M14 7l5 5-5 5"/></svg>;
}

function CheckIcon() {
  return <svg viewBox="0 0 24 24" aria-hidden="true"><path d="m5 12 4 4L19 6"/></svg>;
}

function AlertIcon() {
  return <svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="9"/><path d="M12 7v6M12 17h.01"/></svg>;
}

function ShieldCheckIcon() {
  return <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 3 5 6v5c0 4.7 2.8 8.2 7 10 4.2-1.8 7-5.3 7-10V6l-7-3Z"/><path d="m9 12 2 2 4-4"/></svg>;
}

function ChartIcon() {
  return <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 18V9M12 18V5M19 18v-6"/></svg>;
}

function HeadsetIcon() {
  return <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 13v-1a8 8 0 0 1 16 0v1"/><path d="M4 13h3v6H5a1 1 0 0 1-1-1v-5ZM20 13h-3v6h2a1 1 0 0 0 1-1v-5ZM17 19c0 1.1-1.3 2-3 2h-2"/></svg>;
}
