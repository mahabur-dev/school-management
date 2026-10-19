"use client";

import { useEffect, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { AppIcon } from "@/components/ui/app-icon";
import { PageHeader } from "@/components/ui/page-header";
import { useToast } from "@/components/ui/toast";
import { authApi } from "@/features/auth/api";
import { ApiError } from "@/lib/api/error";
import { session } from "@/lib/auth/session";
import type { CurrentUser, SchoolProfile } from "@/types/auth";
import { profileApi, type SchoolProfileInput } from "../api";
import styles from "./profile-page.module.css";

export function ProfilePage() {
  const router = useRouter();
  const toast = useToast();
  const [user, setUser] = useState<CurrentUser | null>(session.get()?.user ?? null);
  const [savingPersonal, setSavingPersonal] = useState(false);
  const [savingSchool, setSavingSchool] = useState(false);
  const [changingPassword, setChangingPassword] = useState(false);
  const isPlatform = user?.role === "SUPER_ADMIN";
  const loginHref = isPlatform ? "/super-admin/login" : "/login";

  useEffect(() => {
    const active = session.get();
    if (!active) return;
    authApi
      .me(active.accessToken)
      .then((freshUser) => storeUser(freshUser))
      .catch(() => undefined);
  }, []);

  function storeUser(nextUser: CurrentUser) {
    const active = session.get();
    if (active) session.set({ ...active, user: nextUser });
    setUser(nextUser);
  }

  async function updatePersonal(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const active = session.get();
    if (!active) return;
    const form = new FormData(event.currentTarget);
    setSavingPersonal(true);
    try {
      const updated = await profileApi.updatePersonal(active.accessToken, {
        firstName: String(form.get("firstName") ?? "").trim(),
        lastName: String(form.get("lastName") ?? "").trim(),
        phoneNumber: nullable(form.get("phoneNumber")),
      });
      storeUser(updated);
      toast.success("Personal details updated successfully.");
    } catch (caught) {
      toast.error(messageFrom(caught, "Could not update your profile."));
    } finally {
      setSavingPersonal(false);
    }
  }

  async function updateSchool(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const active = session.get();
    if (!active || !user?.school) return;
    const form = new FormData(event.currentTarget);
    const input: SchoolProfileInput = {
      name: String(form.get("name") ?? "").trim(),
      contactEmail: nullable(form.get("contactEmail")),
      phoneNumber: nullable(form.get("schoolPhoneNumber")),
      websiteUrl: nullable(form.get("websiteUrl")),
      addressLine1: nullable(form.get("addressLine1")),
      addressLine2: nullable(form.get("addressLine2")),
      city: nullable(form.get("city")),
      stateOrProvince: nullable(form.get("stateOrProvince")),
      postalCode: nullable(form.get("postalCode")),
      country: nullable(form.get("country")),
    };
    setSavingSchool(true);
    try {
      const school = await profileApi.updateSchool(active.accessToken, input);
      storeUser({ ...user, school });
      toast.success("School profile updated successfully.");
    } catch (caught) {
      toast.error(messageFrom(caught, "Could not update the school profile."));
    } finally {
      setSavingSchool(false);
    }
  }

  async function changePassword(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const active = session.get();
    if (!active) return;
    const form = new FormData(event.currentTarget);
    const currentPassword = String(form.get("currentPassword") ?? "");
    const newPassword = String(form.get("newPassword") ?? "");
    const confirmPassword = String(form.get("confirmPassword") ?? "");
    if (newPassword !== confirmPassword) {
      toast.error("New password and confirmation do not match.");
      return;
    }
    setChangingPassword(true);
    try {
      await profileApi.changePassword(active.accessToken, {
        currentPassword,
        newPassword,
      });
      session.clear();
      toast.success("Password changed. Please sign in again.", { duration: 6000 });
      router.replace(loginHref);
    } catch (caught) {
      toast.error(messageFrom(caught, "Could not change your password."));
      setChangingPassword(false);
    }
  }

  if (!user) return <ProfileSkeleton />;

  const fullName = `${user.firstName} ${user.lastName}`;
  const initials = `${user.firstName.charAt(0)}${user.lastName.charAt(0)}`.toUpperCase();

  return (
    <main className={styles.page}>
      <PageHeader
        eyebrow="Account settings"
        title="Profile & security"
        description="Keep your personal information, workspace details, and account security up to date."
      />

      <section className={styles.heroCard}>
        <span className={styles.avatar}>{initials}</span>
        <div className={styles.heroCopy}>
          <span className={styles.status}><i /> Active account</span>
          <h2>{fullName}</h2>
          <p>{isPlatform ? "Super administrator" : "School administrator"}</p>
        </div>
        <div className={styles.heroMeta}>
          <Meta label="Email" value={user.email} />
          <Meta label="Last sign in" value={formatDate(user.lastLoginAt)} />
          <Meta label="Workspace" value={isPlatform ? "School SaaS platform" : user.school?.name ?? "School workspace"} />
        </div>
      </section>

      <div className={styles.contentGrid}>
        <div className={styles.mainColumn}>
          <ProfileSection icon="people" title="Personal information" description="Your name and contact details used across the platform.">
            <form className={styles.formGrid} key={`${user.id}-${user.updatedAt ?? "profile"}`} onSubmit={updatePersonal}>
              <Field label="First name" name="firstName" defaultValue={user.firstName} required autoComplete="given-name" />
              <Field label="Last name" name="lastName" defaultValue={user.lastName} required autoComplete="family-name" />
              <Field label="Phone number" name="phoneNumber" defaultValue={user.phoneNumber ?? ""} type="tel" autoComplete="tel" placeholder="+880 1XXX-XXXXXX" />
              <Field label="Email address" name="email" defaultValue={user.email} type="email" readOnly hint="Email changes require administrator verification." />
              <div className={styles.formActions}><button className={styles.primaryButton} type="submit" disabled={savingPersonal}>{savingPersonal ? "Saving…" : "Save personal details"}</button></div>
            </form>
          </ProfileSection>

          {!isPlatform && user.school ? (
            <ProfileSection icon="building" title="School information" description="Official contact and address details for your school workspace.">
              <SchoolForm school={user.school} saving={savingSchool} onSubmit={updateSchool} />
            </ProfileSection>
          ) : (
            <ProfileSection icon="building" title="Platform access" description="Your account has organisation-wide administrative access.">
              <div className={styles.readonlyGrid}>
                <Meta label="Scope" value="All schools and platform configuration" />
                <Meta label="Role" value="Super Admin" />
                <Meta label="Email verification" value={user.emailVerified ? "Verified" : "Pending"} />
                <Meta label="Account status" value={user.status === "ACTIVE" ? "Active" : "Suspended"} />
              </div>
            </ProfileSection>
          )}
        </div>

        <aside className={styles.sideColumn}>
          <ProfileSection icon="settings" title="Change password" description="Use a strong password that you do not use elsewhere.">
            <form className={styles.passwordForm} onSubmit={changePassword}>
              <Field label="Current password" name="currentPassword" type="password" autoComplete="current-password" required />
              <Field label="New password" name="newPassword" type="password" autoComplete="new-password" required minLength={8} />
              <Field label="Confirm new password" name="confirmPassword" type="password" autoComplete="new-password" required minLength={8} />
              <div className={styles.passwordPolicy}><AppIcon name="check" /><span>At least 8 characters with uppercase, lowercase, number, and special character.</span></div>
              <button className={styles.primaryButton} type="submit" disabled={changingPassword}>{changingPassword ? "Updating…" : "Update password"}</button>
            </form>
          </ProfileSection>
          <div className={styles.securityCard}><span><AppIcon name="check" /></span><div><strong>Role-based protection</strong><p>Your access is secured and scoped to your assigned workspace.</p></div></div>
        </aside>
      </div>
    </main>
  );
}

function SchoolForm({ school, saving, onSubmit }: { school: SchoolProfile; saving: boolean; onSubmit: (event: FormEvent<HTMLFormElement>) => void }) {
  return (
    <form className={styles.formGrid} key={`${school.id}-${school.updatedAt}`} onSubmit={onSubmit}>
      <Field label="School name" name="name" defaultValue={school.name} required className={styles.fullField} />
      <Field label="Official email" name="contactEmail" defaultValue={school.contactEmail ?? ""} type="email" autoComplete="organization-email" />
      <Field label="Phone number" name="schoolPhoneNumber" defaultValue={school.phoneNumber ?? ""} type="tel" autoComplete="organization-tel" />
      <Field label="Website" name="websiteUrl" defaultValue={school.websiteUrl ?? ""} type="url" placeholder="https://school.edu" className={styles.fullField} />
      <Field label="Address line 1" name="addressLine1" defaultValue={school.addressLine1 ?? ""} autoComplete="address-line1" className={styles.fullField} />
      <Field label="Address line 2" name="addressLine2" defaultValue={school.addressLine2 ?? ""} autoComplete="address-line2" className={styles.fullField} />
      <Field label="City" name="city" defaultValue={school.city ?? ""} autoComplete="address-level2" />
      <Field label="State / Province" name="stateOrProvince" defaultValue={school.stateOrProvince ?? ""} autoComplete="address-level1" />
      <Field label="Postal code" name="postalCode" defaultValue={school.postalCode ?? ""} autoComplete="postal-code" />
      <Field label="Country" name="country" defaultValue={school.country ?? ""} autoComplete="country-name" />
      <Field label="Workspace ID" name="slug" defaultValue={school.slug} readOnly hint="The workspace ID is permanent." />
      <Field label="Workspace status" name="status" defaultValue={school.status === "ACTIVE" ? "Active" : "Suspended"} readOnly />
      <div className={styles.formActions}><button className={styles.primaryButton} type="submit" disabled={saving}>{saving ? "Saving…" : "Save school information"}</button></div>
    </form>
  );
}

type FieldProps = React.InputHTMLAttributes<HTMLInputElement> & { label: string; hint?: string };
function Field({ label, hint, className, ...props }: FieldProps) {
  return <label className={`${styles.field} ${className ?? ""}`}><span>{label}</span><input {...props} />{hint ? <small>{hint}</small> : null}</label>;
}

function ProfileSection({ icon, title, description, children }: { icon: "people" | "building" | "settings"; title: string; description: string; children: React.ReactNode }) {
  return <section className={styles.sectionCard}><header><span className={styles.sectionIcon}><AppIcon name={icon} /></span><div><h3>{title}</h3><p>{description}</p></div></header>{children}</section>;
}

function Meta({ label, value }: { label: string; value: string }) { return <div className={styles.meta}><span>{label}</span><strong title={value}>{value}</strong></div>; }
function ProfileSkeleton() { return <main className={styles.page}><div className={styles.skeletonTitle} /><div className={styles.skeletonCard} /></main>; }
function nullable(value: FormDataEntryValue | null) { const text = String(value ?? "").trim(); return text || null; }
function messageFrom(error: unknown, fallback: string) { return error instanceof ApiError ? error.message : fallback; }
function formatDate(value: string | null) { return value ? new Intl.DateTimeFormat("en", { dateStyle: "medium", timeStyle: "short" }).format(new Date(value)) : "Not recorded"; }
