"use client";

import { FormEvent, useEffect, useState } from "react";
import { AppIcon } from "@/components/ui/app-icon";
import { OptionSelect } from "@/components/ui/option-select";
import { PageHeader } from "@/components/ui/page-header";
import { useToast } from "@/components/ui/toast";
import { featuresApi } from "@/features/features/api";
import { ApiError } from "@/lib/api/error";
import { session } from "@/lib/auth/session";
import type { ConfiguredField } from "@/types/feature";
import type { Student } from "@/types/student";
import { studentsApi } from "../api";
import styles from "./students-page.module.css";

export function StudentsPage() {
  const token = session.get()?.accessToken;
  const [students, setStudents] = useState<Student[]>([]);
  const [fields, setFields] = useState<ConfiguredField[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [open, setOpen] = useState(false);
  const [editingStudent, setEditingStudent] = useState<Student | null>(null);
  const [viewingStudent, setViewingStudent] = useState<Student | null>(null);
  const [deletingStudent, setDeletingStudent] = useState<Student | null>(null);
  const toast = useToast();

  async function deleteStudent(student: Student) {
    if (!token) return;
    try {
      await studentsApi.remove(token, student.id);
      setStudents((current) => current.filter(({ id }) => id !== student.id));
      setDeletingStudent(null);
      toast.success(`${student.name} was deleted.`);
    } catch (caught) {
      toast.error(
        caught instanceof ApiError
          ? caught.message
          : "Student could not be deleted.",
      );
    }
  }

  useEffect(() => {
    if (!token) return;
    Promise.all([
      studentsApi.list(token, "?page=1&limit=100"),
      featuresApi.myStudentFields(token),
    ])
      .then(([list, configuration]) => {
        setStudents(list.items);
        setFields(configuration);
      })
      .catch((caught) =>
        setError(
          caught instanceof ApiError
            ? caught.message
            : "Students could not be loaded.",
        ),
      );
  }, [token]);

  return (
    <main className={styles.page}>
      <PageHeader
        eyebrow="Student directory"
        title="Students"
        description="Create and manage student records for your school workspace."
        action={
          <button
            className={styles.addButton}
            type="button"
            onClick={() => setOpen(true)}
          >
            <AppIcon name="plus" /> Add student
          </button>
        }
      />
      {error ? <p className={styles.error}>{error}</p> : null}
      <section className={styles.card} aria-label="Student directory">
        <table>
          <thead>
            <tr>
              <th>Name</th>
              <th>Class</th>
              <th>Roll number</th>
              <th>Created</th>
              <th className={styles.actionsHeading}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {students.map((student) => (
              <tr key={student.id}>
                <td>
                  <strong>{student.name}</strong>
                </td>
                <td>{student.className}</td>
                <td>{student.rollNo}</td>
                <td>
                  {new Intl.DateTimeFormat("en", {
                    day: "2-digit",
                    month: "short",
                    year: "numeric",
                  }).format(new Date(student.createdAt))}
                </td>
                <td>
                  <div className={styles.rowActions}>
                    <button
                      aria-label={`View ${student.name}`}
                      className={styles.viewAction}
                      onClick={() => setViewingStudent(student)}
                      title="View student"
                      type="button"
                    >
                      <AppIcon name="eye" />
                    </button>
                    <button
                      aria-label={`Edit ${student.name}`}
                      className={styles.editAction}
                      onClick={() => setEditingStudent(student)}
                      title="Edit student"
                      type="button"
                    >
                      <AppIcon name="edit" />
                    </button>
                    <button
                      aria-label={`Delete ${student.name}`}
                      className={styles.deleteAction}
                      onClick={() => setDeletingStudent(student)}
                      title="Delete student"
                      type="button"
                    >
                      <AppIcon name="trash" />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
            {!students.length ? (
              <tr>
                <td colSpan={5} className={styles.empty}>
                  No student records have been created yet.
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </section>
      {open && token ? (
        <StudentDialog
          token={token}
          fields={fields}
          onClose={() => setOpen(false)}
          onCreated={(student) => {
            setStudents((current) => [student, ...current]);
            setOpen(false);
          }}
        />
      ) : null}
      {editingStudent && token ? (
        <StudentDialog
          fields={fields}
          student={editingStudent}
          token={token}
          onClose={() => setEditingStudent(null)}
          onSaved={(student) => {
            setStudents((current) =>
              current.map((item) => (item.id === student.id ? student : item)),
            );
            setEditingStudent(null);
            toast.success(`${student.name}'s record was updated.`);
          }}
        />
      ) : null}
      {viewingStudent ? (
        <StudentDetailsDialog
          fields={fields}
          student={viewingStudent}
          onClose={() => setViewingStudent(null)}
        />
      ) : null}
      {deletingStudent ? (
        <DeleteStudentDialog
          student={deletingStudent}
          onCancel={() => setDeletingStudent(null)}
          onConfirm={() => void deleteStudent(deletingStudent)}
        />
      ) : null}
    </main>
  );
}

function StudentDialog({
  token,
  fields,
  student,
  onClose,
  onCreated,
  onSaved,
}: {
  token: string;
  fields: ConfiguredField[];
  student?: Student;
  onClose: () => void;
  onCreated?: (student: Student) => void;
  onSaved?: (student: Student) => void;
}) {
  const [values, setValues] = useState<Record<string, string>>(() =>
    toFormValues(student),
  );
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const visible = fields.filter((field) => field.enabled && !field.isCore);
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    const missingField = fields.find(
      (field) => field.enabled && field.required && !values[field.key],
    );
    if (missingField) {
      setError(`${missingField.label} is required.`);
      return;
    }
    setSaving(true);
    const extraData = Object.fromEntries(
      visible
        .filter((field) => values[field.key])
        .map((field) => [field.key, values[field.key]]),
    );
    try {
      const input = {
        name: values.name ?? "",
        className: values.class_name ?? "",
        rollNo: values.roll_no ?? "",
        extraData,
      };
      const saved = student
        ? await studentsApi.update(token, student.id, input)
        : await studentsApi.create(token, input);
      if (student) onSaved?.(saved);
      else onCreated?.(saved);
    } catch (caught) {
      setError(
        caught instanceof ApiError
          ? caught.message
          : "Student could not be saved.",
      );
    } finally {
      setSaving(false);
    }
  }
  return (
    <div className={styles.backdrop}>
      <form className={styles.dialog} onSubmit={submit}>
        <header>
          <div>
            <span>{student ? "Student record" : "New student record"}</span>
            <h2>{student ? "Edit student" : "Add student"}</h2>
          </div>
          <button type="button" onClick={onClose} aria-label="Close dialog">
            <AppIcon name="x" />
          </button>
        </header>
        {fields
          .filter((field) => field.enabled)
          .map((field) =>
            field.type === "date" ? (
              <DateField
                key={`${student?.id ?? "new"}-${field.key}`}
                label={field.label}
                required={field.required}
                value={values[field.key] ?? ""}
                onChange={(value) =>
                  setValues({ ...values, [field.key]: value })
                }
              />
            ) : (
              <label key={field.key}>
                {field.label}
                {field.required ? " *" : ""}
                <input
                  type={field.type === "number" ? "number" : "text"}
                  required={field.required}
                  value={values[field.key] ?? ""}
                  onChange={(event) =>
                    setValues({ ...values, [field.key]: event.target.value })
                  }
                />
              </label>
            ),
          )}
        {error ? <p className={styles.error}>{error}</p> : null}
        <footer>
          <button type="button" onClick={onClose}>
            Cancel
          </button>
          <button type="submit" disabled={saving}>
            {saving ? "Saving…" : student ? "Save changes" : "Save student"}
          </button>
        </footer>
      </form>
    </div>
  );
}

type DateParts = { day: string; month: string; year: string };
const MONTHS = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];
const YEARS = Array.from(
  { length: new Date().getFullYear() - 1899 },
  (_, index) => String(new Date().getFullYear() - index),
);

function DateField({
  label,
  required,
  value,
  onChange,
}: {
  label: string;
  required: boolean;
  value: string;
  onChange: (value: string) => void;
}) {
  const [parts, setParts] = useState<DateParts>(() => dateParts(value));
  const daysInMonth =
    parts.month && parts.year
      ? new Date(Number(parts.year), Number(parts.month), 0).getDate()
      : 31;
  const days = Array.from({ length: daysInMonth }, (_, index) =>
    String(index + 1).padStart(2, "0"),
  );

  function update(part: keyof DateParts, value: string) {
    const next = { ...parts, [part]: value };
    const maxDay =
      next.month && next.year
        ? new Date(Number(next.year), Number(next.month), 0).getDate()
        : 31;
    if (next.day && Number(next.day) > maxDay) next.day = "";
    setParts(next);
    onChange(
      next.year && next.month && next.day
        ? `${next.year}-${next.month}-${next.day}`
        : "",
    );
  }

  return (
    <fieldset className={styles.dateField}>
      <legend>
        {label}
        {required ? " *" : ""}
      </legend>
      <span className={styles.dateHint}>Select month, day, and year</span>
      <div className={styles.dateSelects}>
        <label>
          <span>Month</span>
          <OptionSelect
            ariaLabel={`${label} month`}
            options={MONTHS.map((month, index) => ({
              label: month,
              value: String(index + 1).padStart(2, "0"),
            }))}
            placeholder="Month"
            value={parts.month}
            onChange={(value) => update("month", value)}
          />
        </label>
        <label>
          <span>Day</span>
          <OptionSelect
            ariaLabel={`${label} day`}
            options={days.map((day) => ({ label: day, value: day }))}
            placeholder="Day"
            value={parts.day}
            onChange={(value) => update("day", value)}
          />
        </label>
        <label>
          <span>Year</span>
          <OptionSelect
            ariaLabel={`${label} year`}
            options={YEARS.map((year) => ({ label: year, value: year }))}
            placeholder="Year"
            value={parts.year}
            onChange={(value) => update("year", value)}
          />
        </label>
      </div>
    </fieldset>
  );
}

function toFormValues(student?: Student): Record<string, string> {
  if (!student) return {};
  return {
    name: student.name,
    class_name: student.className,
    roll_no: student.rollNo,
    ...Object.fromEntries(
      Object.entries(student.extraData).map(([key, value]) => [
        key,
        String(value ?? ""),
      ]),
    ),
  };
}

function dateParts(value: string): DateParts {
  const [year = "", month = "", day = ""] = value.split("-");
  return { day, month, year };
}

function StudentDetailsDialog({
  fields,
  student,
  onClose,
}: {
  fields: ConfiguredField[];
  student: Student;
  onClose: () => void;
}) {
  const values = toFormValues(student);
  return (
    <div className={styles.backdrop}>
      <section
        aria-labelledby="student-details-title"
        className={styles.detailsDialog}
        role="dialog"
      >
        <header>
          <div>
            <span>Student record</span>
            <h2 id="student-details-title">{student.name}</h2>
          </div>
          <button aria-label="Close details" onClick={onClose} type="button">
            <AppIcon name="x" />
          </button>
        </header>
        <dl className={styles.detailsList}>
          {fields
            .filter((field) => field.enabled)
            .map((field) => (
              <div key={field.key}>
                <dt>{field.label}</dt>
                <dd>{formatFieldValue(values[field.key], field.type)}</dd>
              </div>
            ))}
        </dl>
        <footer>
          <button onClick={onClose} type="button">
            Close
          </button>
        </footer>
      </section>
    </div>
  );
}

function DeleteStudentDialog({
  student,
  onCancel,
  onConfirm,
}: {
  student: Student;
  onCancel: () => void;
  onConfirm: () => void;
}) {
  return (
    <div className={styles.backdrop}>
      <section
        aria-labelledby="delete-student-title"
        className={styles.confirmDialog}
        role="alertdialog"
      >
        <span className={styles.deleteIcon}>
          <AppIcon name="trash" />
        </span>
        <h2 id="delete-student-title">Delete student record?</h2>
        <p>
          <strong>{student.name}</strong> will be removed from this school
          workspace. This action cannot be undone.
        </p>
        <footer>
          <button onClick={onCancel} type="button">
            Cancel
          </button>
          <button onClick={onConfirm} type="button">
            Delete student
          </button>
        </footer>
      </section>
    </div>
  );
}

function formatFieldValue(
  value: string | undefined,
  type: ConfiguredField["type"],
) {
  if (!value) return "Not provided";
  if (type !== "date") return value;
  const date = new Date(`${value}T00:00:00`);
  return Number.isNaN(date.getTime())
    ? value
    : new Intl.DateTimeFormat("en", {
        day: "2-digit",
        month: "long",
        year: "numeric",
      }).format(date);
}
