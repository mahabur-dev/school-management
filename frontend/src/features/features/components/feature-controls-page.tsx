"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { AppIcon } from "@/components/ui/app-icon";
import { PageHeader } from "@/components/ui/page-header";
import { useToast } from "@/components/ui/toast";
import { schoolsApi } from "@/features/schools/api";
import { ApiError } from "@/lib/api/error";
import { session } from "@/lib/auth/session";
import type { ConfiguredField, FeatureKey } from "@/types/feature";
import type { School } from "@/types/school";
import { featuresApi } from "../api";
import styles from "./feature-controls-page.module.css";

const STUDENT_FEATURE: FeatureKey = "student_management";

export function FeatureControlsPage() {
  const token = session.get()?.accessToken;
  const [schools, setSchools] = useState<School[]>([]);
  const [schoolId, setSchoolId] = useState("");
  const [enabled, setEnabled] = useState(true);
  const [fields, setFields] = useState<ConfiguredField[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const { error: showError, success: showSuccess } = useToast();
  const [workspaceOpen, setWorkspaceOpen] = useState(false);
  const [workspaceQuery, setWorkspaceQuery] = useState("");
  const workspacePickerRef = useRef<HTMLDivElement>(null);
  const selectedSchool = useMemo(
    () => schools.find((school) => school.id === schoolId),
    [schoolId, schools],
  );
  const filteredSchools = useMemo(() => {
    const query = workspaceQuery.trim().toLowerCase();
    if (!query) return schools;
    return schools.filter((school) =>
      school.name.toLowerCase().includes(query),
    );
  }, [schools, workspaceQuery]);

  useEffect(() => {
    function closePicker(event: MouseEvent) {
      if (!workspacePickerRef.current?.contains(event.target as Node)) {
        setWorkspaceOpen(false);
      }
    }
    function closeOnEscape(event: KeyboardEvent) {
      if (event.key === "Escape") setWorkspaceOpen(false);
    }
    document.addEventListener("mousedown", closePicker);
    document.addEventListener("keydown", closeOnEscape);
    return () => {
      document.removeEventListener("mousedown", closePicker);
      document.removeEventListener("keydown", closeOnEscape);
    };
  }, []);

  useEffect(() => {
    if (!token) return;
    schoolsApi
      .list(token, "?page=1&limit=100")
      .then((response) => {
        setSchools(response.items);
        setSchoolId(response.items[0]?.id ?? "");
        if (response.items.length === 0) setLoading(false);
      })
      .catch(() => {
        showError("School workspaces could not be loaded.");
        setLoading(false);
      });
  }, [showError, token]);

  useEffect(() => {
    if (!token || !schoolId) return;
    featuresApi
      .getSchoolFields(token, schoolId, STUDENT_FEATURE)
      .then(setFields)
      .catch(() => showError("Field configuration could not be loaded."))
      .finally(() => setLoading(false));
  }, [schoolId, showError, token]);

  async function save() {
    if (!token || !schoolId) return;
    setSaving(true);
    try {
      await featuresApi.setSchoolFeature(
        token,
        schoolId,
        STUDENT_FEATURE,
        enabled,
      );
      setFields(
        await featuresApi.updateSchoolFields(
          token,
          schoolId,
          STUDENT_FEATURE,
          fields,
        ),
      );
      showSuccess("Configuration saved successfully.");
    } catch (caught) {
      showError(
        caught instanceof ApiError
          ? caught.message
          : "Configuration could not be saved.",
      );
    } finally {
      setSaving(false);
    }
  }

  function setField(key: string, patch: Partial<ConfiguredField>) {
    setFields((current) =>
      current.map((field) =>
        field.key === key ? { ...field, ...patch } : field,
      ),
    );
  }

  function selectWorkspace(nextSchoolId: string) {
    if (nextSchoolId === schoolId) {
      setWorkspaceOpen(false);
      return;
    }
    setLoading(true);
    setSchoolId(nextSchoolId);
    setWorkspaceOpen(false);
    setWorkspaceQuery("");
  }

  return (
    <main className={styles.page}>
      <PageHeader
        eyebrow="Platform configuration"
        title="Feature controls"
        description="Manage module access and data requirements for each school workspace."
        action={
          <span className={styles.contextBadge}>
            <AppIcon name="features" /> Student Management
          </span>
        }
      />
      <section
        className={styles.workspaceCard}
        aria-labelledby="workspace-title"
      >
        <div className={styles.cardHeader}>
          <span className={styles.cardIcon}>
            <AppIcon name="building" />
          </span>
          <div>
            <h2 id="workspace-title">School workspace</h2>
            <p>
              Select the tenant whose Student Management policy you want to
              configure.
            </p>
          </div>
        </div>
        <div className={styles.workspaceSelect} ref={workspacePickerRef}>
          <span>Workspace</span>
          <button
            className={styles.selectControl}
            type="button"
            aria-haspopup="listbox"
            aria-expanded={workspaceOpen}
            disabled={loading || schools.length === 0}
            onClick={() => setWorkspaceOpen((open) => !open)}
          >
            <span className={styles.schoolInitial}>
              {selectedSchool?.name.charAt(0) ?? "—"}
            </span>
            <span className={styles.selectedWorkspace}>
              <strong>
                {selectedSchool?.name ?? "No workspace available"}
              </strong>
            </span>
            <AppIcon name="chevron-down" />
          </button>
          {workspaceOpen ? (
            <div className={styles.workspaceMenu}>
              <div className={styles.menuHeader}>
                <strong>Switch workspace</strong>
                <span>{schools.length} schools</span>
              </div>
              <label className={styles.workspaceSearch}>
                <AppIcon name="search" />
                <input
                  value={workspaceQuery}
                  onChange={(event) => setWorkspaceQuery(event.target.value)}
                  placeholder="Search schools"
                  autoFocus
                />
              </label>
              <div
                className={styles.workspaceOptions}
                role="listbox"
                aria-label="School workspaces"
              >
                {filteredSchools.map((school) => {
                  const selected = school.id === schoolId;
                  return (
                    <button
                      type="button"
                      role="option"
                      aria-selected={selected}
                      className={
                        selected
                          ? styles.workspaceOptionSelected
                          : styles.workspaceOption
                      }
                      key={school.id}
                      onClick={() => selectWorkspace(school.id)}
                    >
                      <span className={styles.optionInitial}>
                        {school.name.charAt(0)}
                      </span>
                      <span>
                        <strong>{school.name}</strong>
                      </span>
                      {selected ? (
                        <span className={styles.selectedCheck}>
                          <AppIcon name="check" />
                        </span>
                      ) : null}
                    </button>
                  );
                })}
                {filteredSchools.length === 0 ? (
                  <p className={styles.noWorkspaces}>
                    No matching workspace found.
                  </p>
                ) : null}
              </div>
            </div>
          ) : null}
        </div>
      </section>
      <section className={styles.policyCard} aria-labelledby="module-title">
        <div className={styles.moduleRow}>
          <div className={styles.moduleIdentity}>
            <span className={styles.moduleIcon}>
              <AppIcon name="student" />
            </span>
            <div>
              <h2 id="module-title">Student Management</h2>
              <p>
                Allow this school to access student records and related
                workflows.
              </p>
            </div>
          </div>
          <label className={styles.switchLabel}>
            <span
              className={enabled ? styles.statusEnabled : styles.statusDisabled}
            >
              {enabled ? "Enabled" : "Disabled"}
            </span>
            <input
              type="checkbox"
              checked={enabled}
              onChange={(event) => {
                setEnabled(event.target.checked);
              }}
              disabled={loading}
            />
            <span className={styles.switchTrack}>
              <span />
            </span>
          </label>
        </div>
        <div className={styles.fieldsHeader}>
          <div>
            <h3>Student form fields</h3>
            <p>
              Control which information appears on the form and which values are
              mandatory.
            </p>
          </div>
          <span>{fields.length} fields</span>
        </div>
        <div className={styles.fieldLabels} aria-hidden="true">
          <span>Field</span>
          <span>Visible</span>
          <span>Required</span>
        </div>
        <div className={styles.fieldList}>
          {loading ? (
            <FieldSkeleton />
          ) : (
            fields.map((field) => (
              <div className={styles.fieldRow} key={field.key}>
                <div className={styles.fieldIdentity}>
                  <span
                    className={
                      field.isCore ? styles.coreMark : styles.optionalMark
                    }
                  >
                    {field.label.charAt(0)}
                  </span>
                  <div>
                    <strong>{field.label}</strong>
                    <small>
                      {field.isCore
                        ? "Core field · always required"
                        : `${field.type.toLowerCase()} · ${field.key}`}
                    </small>
                  </div>
                </div>
                <PolicyCheckbox
                  label={`Show ${field.label}`}
                  checked={field.enabled}
                  disabled={field.isCore || !enabled}
                  locked={field.isCore}
                  onChange={(checked) =>
                    setField(field.key, {
                      enabled: checked,
                      required: checked ? field.required : false,
                    })
                  }
                />
                <PolicyCheckbox
                  label={`Require ${field.label}`}
                  checked={field.required}
                  disabled={field.isCore || !field.enabled || !enabled}
                  locked={field.isCore}
                  onChange={(checked) =>
                    setField(field.key, { required: checked })
                  }
                />
              </div>
            ))
          )}
        </div>
        <footer className={styles.cardFooter}>
          <p>Changes apply to new requests immediately.</p>
          <button
            type="button"
            onClick={save}
            disabled={!schoolId || loading || saving}
          >
            {saving ? "Saving changes…" : "Save changes"}
          </button>
        </footer>
      </section>
    </main>
  );
}

function PolicyCheckbox({
  label,
  checked,
  disabled,
  locked = false,
  onChange,
}: {
  label: string;
  checked: boolean;
  disabled: boolean;
  locked?: boolean;
  onChange: (checked: boolean) => void;
}) {
  return (
    <label className={styles.checkbox}>
      <input
        type="checkbox"
        aria-label={label}
        checked={checked}
        disabled={disabled}
        onChange={(event) => onChange(event.target.checked)}
      />
      <span>
        <AppIcon name="check" />
      </span>
      <strong className={checked ? styles.controlOn : styles.controlOff}>
        {locked ? "Always on" : checked ? "On" : "Off"}
      </strong>
    </label>
  );
}

function FieldSkeleton() {
  return (
    <>
      {Array.from({ length: 5 }, (_, index) => (
        <div className={styles.skeletonRow} key={index}>
          <span />
          <span />
          <span />
        </div>
      ))}
    </>
  );
}
