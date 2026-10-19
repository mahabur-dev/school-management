"use client";

import { useState, type FormEvent, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { ApiError } from "@/lib/api/error";
import { session } from "@/lib/auth/session";
import { authApi, type ResolvedTenant } from "../api";
import styles from "./login-screen.module.css";

type LoginScreenProps = { mode: "platform" | "school"; tenantName?: string; tenantSlug?: string };
type Story = {
  eyebrow: string; title: ReactNode; description: string; overview: string; status: string;
  metrics: Array<[string, string, string, string]>; insight: string; insightDetail: string;
  trend: string; trust: string; features: Array<[string, string]>;
};

const schoolStory: Story = {
  eyebrow: "Secure school operations",
  title: <><span>Your school.</span><em>One connected<br />workspace.</em></>,
  description: "Manage academics, attendance, staff and finances from one secure, easy-to-use platform.",
  overview: "School at a glance", status: "Live insights from your school",
  metrics: [
    ["Students", "1,738", "+12%", "vs last term"], ["Attendance", "94.2%", "+2.1%", "vs last term"],
    ["Fees collected", "89%", "+8%", "vs last term"], ["Active classes", "48", "+6%", "vs last term"],
  ],
  insight: "Student Attendance Trend", insightDetail: "Current attendance rate", trend: "94.2%", trust: "Secure workspace",
  features: [["Academics", "Classes, exams and results"], ["Attendance", "Real-time tracking"],
    ["Staff Management", "Teachers and administration"], ["Finances", "Fees, payments and reports"]],
};

const platformStory: Story = {
  eyebrow: "Secure school operations",
  title: <><span>Every school.</span><span>One control centre<em>.</em></span></>,
  description: "Manage people, academics, and daily operations from one secure, multi-tenant platform.",
  overview: "Platform overview", status: "All systems performing well",
  metrics: [["Total Schools", "128", "+12%", "this month"], ["Total Students", "48,923", "+8%", "this month"],
    ["System Uptime", "99.98%", "", "Last 30 days"]],
  insight: "Growth trend", insightDetail: "More schools joining every month", trend: "+18%", trust: "Multi-tenant architecture",
  features: [["Student Management", ""], ["Academic Operations", ""], ["Real-time Analytics", ""], ["Secure & Reliable", ""]],
};

export function LoginScreen({ mode, tenantName, tenantSlug }: LoginScreenProps) {
  const router = useRouter();
  const initialTenant = mode === "school" && tenantSlug ? { id: "", name: tenantName ?? tenantSlug, slug: tenantSlug } : null;
  const [tenant, setTenant] = useState<ResolvedTenant | null>(initialTenant);
  const [selectingTenant, setSelectingTenant] = useState(false);
  const [tenantQuery, setTenantQuery] = useState("");
  const [isResolvingTenant, setIsResolvingTenant] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const canSwitchTenant = mode === "platform";
  const isTenantLogin = mode === "school" || tenant !== null;
  const activePortal = isTenantLogin ? "SCHOOL" : "PLATFORM";
  const story = isTenantLogin ? schoolStory : platformStory;

  async function resolveTenant(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setError(null); setIsResolvingTenant(true);
    try { const resolved = await authApi.resolveTenant(tenantQuery); setTenant(resolved); setSelectingTenant(false); setTenantQuery(""); }
    catch (caught) { setError(caught instanceof ApiError ? caught.message : "We could not find that school workspace."); }
    finally { setIsResolvingTenant(false); }
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setError(null); setIsSubmitting(true);
    const form = new FormData(event.currentTarget);
    try {
      const authSession = await authApi.login({ email: String(form.get("email") ?? ""), password: String(form.get("password") ?? ""),
        rememberMe: form.get("rememberMe") === "on", portal: activePortal,
        ...(isTenantLogin && tenant ? { tenantSlug: tenant.slug } : {}) });
      const expectedRole = activePortal === "PLATFORM" ? "SUPER_ADMIN" : "SCHOOL_ADMIN";
      if (authSession.user.role !== expectedRole) {
        await authApi.logout(authSession.accessToken).catch(() => undefined);
        setError(activePortal === "PLATFORM" ? "This account does not have platform administrator access."
          : "This account cannot access the selected school workspace."); return;
      }
      session.set(authSession); router.replace(activePortal === "PLATFORM" ? "/super-admin" : "/dashboard");
    } catch (caught) { setError(caught instanceof ApiError ? caught.message : "We could not sign you in. Please try again."); }
    finally { setIsSubmitting(false); }
  }

  const sceneAsset = isTenantLogin
    ? "/assets/auth/school-campus.webp"
    : "/assets/auth/super-admin-campus.webp";

  return (
    <>
      <link
        rel="preload"
        as="image"
        href={sceneAsset}
        type="image/webp"
        fetchPriority="high"
      />
      <main className={styles.page}>
      <div className={styles.orbOne} aria-hidden="true" /><div className={styles.orbTwo} aria-hidden="true" />
      <section className={styles.shell} aria-label={`${mode === "platform" ? "Platform" : "School"} sign in`}>
        <aside className={`${styles.storyPanel} ${isTenantLogin ? styles.schoolStory : styles.platformStory}`}>
          <div className={styles.scene} aria-hidden="true" /><Brand light />
          <div className={styles.storyContent}>
            <span className={styles.eyebrow}><ShieldCheckIcon />{story.eyebrow}</span><h1>{story.title}</h1><p>{story.description}</p>
            <div className={styles.featureHighlights} aria-hidden="true">
              {story.features.map(([feature, detail], index) => <span key={feature}><span className={styles.featureGlyph}><FeatureIcon index={index} /></span>
                <span className={styles.featureCopy}><strong>{feature}</strong>{detail ? <small>{detail}</small> : null}</span></span>)}
            </div>
            <div className={styles.previewCard} aria-hidden="true">
              <div className={styles.previewTop}><div><strong>{story.overview}</strong><span>{story.status}</span></div><span className={styles.livePill}><i /> Live</span></div>
              <div className={styles.metrics}>{story.metrics.map((metric, index) => <div className={index === 0 ? styles.metricAmber : styles.metricWhite} key={metric[0]}>
                <span className={styles.metricLabel}>{metric[0]}</span><strong>{metric[1]}</strong><small>{metric[2] ? <b>↑ {metric[2]}</b> : null} {metric[3]}</small></div>)}</div>
              <div className={styles.activityRow}><span className={styles.activityIcon}><ChartIcon /></span><span><strong>{story.insight}</strong><small>{story.insightDetail}</small></span>
                <span className={styles.activityTrend}>{story.trend}</span></div>
              {isTenantLogin ? <AttendanceChart /> : <GrowthBars />}
            </div>
          </div>
          <div className={styles.trustLine}><span><CheckIcon /> Role-based access</span><span><CheckIcon /> {story.trust}</span>
            {!isTenantLogin ? <span><CheckIcon /> Enterprise-grade security</span> : null}</div>
        </aside>

        <div className={`${styles.formPanel} ${!isTenantLogin ? styles.platformFormPanel : ""}`}>
          <div className={styles.mobileBrand}><Brand /></div>
          {canSwitchTenant ? (
            <button type="button" className={`${styles.portalContext} ${styles.portalContextSwitch}`}
              onClick={() => { setSelectingTenant(true); setError(null); }} aria-label="Switch school workspace">
              <span className={styles.contextIcon}>{tenant?.name.charAt(0) ?? "P"}</span>
              <span><small>{tenant ? "School workspace" : "Sign in as"}</small><strong>{tenant?.name ?? "Super Admin"}</strong></span>
              <span className={styles.switchLabel}>Switch</span>
            </button>
          ) : (
            <div className={styles.portalContext}><span className={styles.contextIcon}><BuildingIcon /></span>
              <span><small>School workspace</small><strong>{tenant?.name ?? tenantName ?? "Your school"}</strong></span><ChevronIcon /></div>
          )}
          <div className={styles.formWrap}>
            {canSwitchTenant && selectingTenant ? (
              <form className={styles.tenantForm} onSubmit={resolveTenant} noValidate>
                <span className={styles.welcomeMark}>School workspace</span><h2>Find your school</h2>
                <p>Enter your school name to continue. Matching administrator credentials are required for access.</p>
                <label htmlFor="tenantSlug">School name</label><div className={styles.tenantInputWrap}>
                  <input id="tenantSlug" value={tenantQuery} onChange={(event) => setTenantQuery(event.target.value)} placeholder="Type your school name"
                    autoCapitalize="none" autoComplete="organization" required disabled={isResolvingTenant} /></div>
                {error ? <ErrorMessage>{error}</ErrorMessage> : null}
                <button className={styles.submit} type="submit" disabled={isResolvingTenant}><span>{isResolvingTenant ? "Checking workspace…" : "Continue"}</span>
                  {isResolvingTenant ? <span className={styles.spinner} /> : <ArrowIcon />}</button>
                <button className={styles.backButton} type="button" onClick={() => { setSelectingTenant(false); setError(null); }}>Back to {tenant?.name ?? "Super Admin"}</button>
              </form>
            ) : (
              <>
                <div className={styles.formHeading}><span className={styles.welcomeMark}>{isTenantLogin ? "Welcome back" : "Platform access"}</span>
                  <h2>{isTenantLogin ? "Sign in to your school" : "Sign in as Super Admin"}</h2>
                  <p>{isTenantLogin ? `Continue securely to ${tenant?.name ?? tenantName ?? "your school workspace"}.` : "Only authorised platform administrators can continue."}</p></div>
                <form className={styles.form} onSubmit={handleSubmit} noValidate>
                  <div className={styles.field}><label htmlFor="email">{isTenantLogin ? "Work email" : "Email address"}</label>
                    <div className={styles.inputWrap}><span className={styles.inputIcon}><MailIcon /></span><input id="email" name="email" type="email" autoComplete="email"
                      placeholder={isTenantLogin ? "name@school.edu" : "admin@schoolsaas.com"} required disabled={isSubmitting} /></div></div>
                  <div className={styles.field}><label htmlFor="password">Password</label><div className={styles.inputWrap}><span className={styles.inputIcon}><LockIcon /></span>
                    <input id="password" name="password" type={showPassword ? "text" : "password"} autoComplete="current-password" placeholder="Enter your password" required disabled={isSubmitting} />
                    <button className={styles.passwordToggle} type="button" onClick={() => setShowPassword((value) => !value)} aria-label={showPassword ? "Hide password" : "Show password"}
                      aria-pressed={showPassword}>{showPassword ? <EyeOffIcon /> : <EyeIcon />}</button></div></div>
                  <div className={styles.formOptions}><label className={styles.remember}><input name="rememberMe" type="checkbox" disabled={isSubmitting} />
                    <span className={styles.checkbox} aria-hidden="true"><CheckIcon /></span>Keep me signed in on this device</label>
                    {isTenantLogin ? <button type="button" className={styles.textButton} onClick={() => setError("Password recovery is not available from this screen yet. Please contact your school administrator.")}>Forgot password?</button> : null}</div>
                  {error ? <ErrorMessage>{error}</ErrorMessage> : null}
                  <button className={styles.submit} type="submit" disabled={isSubmitting}><span>{isSubmitting ? "Signing in…" : isTenantLogin ? "Sign in to school" : "Sign in securely"}</span>
                    {isSubmitting ? <span className={styles.spinner} /> : <ArrowIcon />}</button>
                </form>
                {isTenantLogin ? <><AuthDivider label="Or continue with" /><div className={styles.socialGrid}>
                  <button type="button" onClick={() => setError("Google sign-in is not configured yet.")}><GoogleIcon /> Continue with Google</button>
                  <button type="button" onClick={() => setError("Microsoft sign-in is not configured yet.")}><MicrosoftIcon /> Continue with Microsoft</button></div>
                  <div className={styles.securityCard}><span className={styles.securityShield}><ShieldCheckIcon /></span><span><strong>Secure School Workspace</strong><small>Your data is encrypted and protected</small></span></div></>
                  : <><div className={styles.support}><LockIcon /><span>Your data is encrypted and protected with enterprise-grade security.</span></div><AuthDivider label="Or" />
                    <button className={styles.ssoButton} type="button" onClick={() => setError("Single Sign-On is not configured yet.")}><ShieldCheckIcon /> Sign in with Single Sign-On (SSO)</button></>}
              </>
            )}
          </div>
          <footer className={styles.footer}><span>© {new Date().getFullYear()} SchoolSaaS. All rights reserved.</span>
            {isTenantLogin ? <span className={styles.footerLinks}><span>Privacy</span><span>Terms</span><span>Support</span></span>
              : <span className={styles.secured}><ShieldCheckIcon /> Secure Access</span>}</footer>
        </div>
      </section>
      </main>
    </>
  );
}

function ErrorMessage({ children }: { children: ReactNode }) { return <div className={styles.error} role="alert"><AlertIcon /><span>{children}</span></div>; }
function AuthDivider({ label }: { label: string }) { return <div className={styles.divider}><span>{label}</span></div>; }
function Brand({ light = false }: { light?: boolean }) { return <div className={`${styles.brand} ${light ? styles.brandLight : ""}`}><span className={styles.brandMark} aria-hidden="true"><span /><span /><span /></span><span><strong>School</strong>SaaS</span></div>; }
function MailIcon() { return <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 6.5h16v11H4z" /><path d="m4.5 7 7.5 6 7.5-6" /></svg>; }
function LockIcon() { return <svg viewBox="0 0 24 24" aria-hidden="true"><rect x="5" y="10" width="14" height="10" rx="2" /><path d="M8.5 10V7.5a3.5 3.5 0 0 1 7 0V10" /></svg>; }
function EyeIcon() { return <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M2.5 12s3.5-6 9.5-6 9.5 6 9.5 6-3.5 6-9.5 6-9.5-6Z" /><circle cx="12" cy="12" r="2.5" /></svg>; }
function EyeOffIcon() { return <svg viewBox="0 0 24 24" aria-hidden="true"><path d="m4 4 16 16" /><path d="M10.7 6.1A10.6 10.6 0 0 1 12 6c6 0 9.5 6 9.5 6a15.7 15.7 0 0 1-2.3 3.1M7.2 7.2C4.2 9 2.5 12 2.5 12s3.5 6 9.5 6a9.8 9.8 0 0 0 3-.5" /></svg>; }
function ArrowIcon() { return <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 12h14M14 7l5 5-5 5" /></svg>; }
function CheckIcon() { return <svg viewBox="0 0 24 24" aria-hidden="true"><path d="m5 12 4 4L19 6" /></svg>; }
function AlertIcon() { return <svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="9" /><path d="M12 7v6M12 17h.01" /></svg>; }
function ShieldCheckIcon() { return <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 3 5 6v5c0 4.7 2.8 8.2 7 10 4.2-1.8 7-5.3 7-10V6l-7-3Z" /><path d="m9 12 2 2 4-4" /></svg>; }
function ChartIcon() { return <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 18V9M12 18V5M19 18v-6" /></svg>; }
function ChevronIcon() { return <svg viewBox="0 0 24 24" aria-hidden="true"><path d="m7 9 5 5 5-5" /></svg>; }
function BuildingIcon() { return <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 21V8l7-4 7 4v13M3 21h18M9 10h2M14 10h2M9 14h2M14 14h2M10 21v-4h4v4" /></svg>; }

function FeatureIcon({ index }: { index: number }) {
  if (index === 1) return <svg viewBox="0 0 24 24" aria-hidden="true"><rect x="4" y="5" width="16" height="15" rx="2" /><path d="M8 3v4M16 3v4M4 9h16M8 13h2M14 13h2M8 17h2" /></svg>;
  if (index === 2) return <svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="9" cy="8" r="3" /><path d="M3 19c.4-4 2.4-6 6-6s5.6 2 6 6M15 6.5a3 3 0 0 1 0 5.5M16 14c2.8.3 4.3 2 4.7 5" /></svg>;
  if (index === 3) return <svg viewBox="0 0 24 24" aria-hidden="true"><rect x="3" y="6" width="18" height="13" rx="2" /><path d="M3 10h18M7 15h4" /></svg>;
  return <svg viewBox="0 0 24 24" aria-hidden="true"><path d="m3 10 9-5 9 5-9 5z" /><path d="M6 12.5V17c3.5 2.7 8.5 2.7 12 0v-4.5" /></svg>;
}

function AttendanceChart() { return <div className={styles.attendanceChart} aria-hidden="true"><span>100%</span><span>80%</span><span>60%</span>
  <svg viewBox="0 0 520 75" preserveAspectRatio="none"><defs><linearGradient id="attendance-fill" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#ffd15d" stopOpacity=".45" /><stop offset="1" stopColor="#ffd15d" stopOpacity="0" /></linearGradient></defs>
    <path className={styles.chartFill} d="M0 56 L45 47 L90 36 L135 38 L180 31 L225 33 L270 24 L315 21 L360 32 L405 23 L450 20 L490 29 L520 14 L520 75 L0 75 Z" />
    <path className={styles.chartLine} d="M0 56 L45 47 L90 36 L135 38 L180 31 L225 33 L270 24 L315 21 L360 32 L405 23 L450 20 L490 29 L520 14" /></svg>
  <div>{["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"].map((month) => <small key={month}>{month}</small>)}</div></div>; }
function GrowthBars() { return <div className={styles.growthBars} aria-hidden="true">{[18, 25, 34, 45, 58, 70, 84, 100].map((height, index) => <i key={index} style={{ height: `${height}%` }} />)}</div>; }
function GoogleIcon() { return <svg className={styles.brandIcon} viewBox="0 0 24 24" aria-hidden="true"><path fill="#4285f4" d="M21.6 12.2c0-.7-.1-1.5-.2-2.2H12v4.3h5.4a4.6 4.6 0 0 1-2 3v2.8h3.5c2-1.9 3.2-4.6 3.2-7.9Z" /><path fill="#34a853" d="M12 22c2.9 0 5.3-1 7-2.5l-3.5-2.8c-1 .7-2.1 1-3.5 1a6.1 6.1 0 0 1-5.8-4.2H2.6v2.9A10.5 10.5 0 0 0 12 22Z" /><path fill="#fbbc05" d="M6.2 13.5a6.3 6.3 0 0 1 0-4V6.6H2.6a10.5 10.5 0 0 0 0 9.8l3.6-2.9Z" /><path fill="#ea4335" d="M12 5.3c1.6 0 3 .6 4.1 1.6l3.1-3A10.4 10.4 0 0 0 2.6 6.6l3.6 2.9A6.1 6.1 0 0 1 12 5.3Z" /></svg>; }
function MicrosoftIcon() { return <svg className={styles.brandIcon} viewBox="0 0 24 24" aria-hidden="true"><path fill="#f25022" d="M2 2h9v9H2z" /><path fill="#7fba00" d="M13 2h9v9h-9z" /><path fill="#00a4ef" d="M2 13h9v9H2z" /><path fill="#ffb900" d="M13 13h9v9h-9z" /></svg>; }
