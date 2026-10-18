"use client";

import { useEffect, useState } from "react";
import { ApiError } from "@/lib/api/error";
import type { StudentFinanceStatement } from "@/types/finance";
import { formatMinorUnits } from "@/lib/finance/money";
import { financeApi } from "../api";
import styles from "./student-finance-panel.module.css";

export function StudentFinancePanel({
  accessToken,
  studentId,
}: {
  accessToken: string;
  studentId: string;
}) {
  const [statement, setStatement] = useState<StudentFinanceStatement | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    const timer = window.setTimeout(() => {
      financeApi
        .studentStatement(accessToken, studentId)
        .then((data) => {
          if (!cancelled) setStatement(data);
        })
        .catch((caught) => {
          if (!cancelled)
            setError(
              caught instanceof ApiError
                ? caught.message
                : "Student finance information could not be loaded.",
            );
        })
        .finally(() => {
          if (!cancelled) setLoading(false);
        });
    }, 0);
    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [accessToken, studentId]);

  if (loading) return <div className={styles.state}>Loading finance statement…</div>;
  if (error) return <div className={styles.error}>{error}</div>;
  if (!statement) return null;

  const summary = [
    ["Total invoiced", statement.summary.totalInvoicedMinor],
    ["Total paid", statement.summary.totalPaidMinor],
    ["Outstanding", statement.summary.outstandingMinor],
    ["Overdue", statement.summary.overdueMinor],
  ] as const;

  return (
    <div className={styles.panel}>
      <section className={styles.metrics} aria-label="Student fee summary">
        {summary.map(([label, amount]) => (
          <article key={label}>
            <span>{label}</span>
            <strong>{money(amount, statement.currency)}</strong>
          </article>
        ))}
      </section>

      <section className={styles.section}>
        <header>
          <div>
            <h3>Invoices</h3>
            <p>Complete invoice and outstanding history for this student.</p>
          </div>
          <span>{statement.invoices.length} records</span>
        </header>
        <div className={styles.tableWrap}>
          <table>
            <thead><tr><th>Invoice</th><th>Due date</th><th>Total</th><th>Paid</th><th>Outstanding</th><th>Status</th></tr></thead>
            <tbody>
              {statement.invoices.map((invoice) => (
                <tr key={invoice.id}>
                  <td><strong>{invoice.invoiceNumber ?? "Draft"}</strong><small>{invoice.academicYear}</small></td>
                  <td>{dateLabel(invoice.dueDate)}</td>
                  <td>{money(invoice.totalMinor, invoice.currency)}</td>
                  <td>{money(invoice.paidMinor, invoice.currency)}</td>
                  <td>{money(invoice.outstandingMinor, invoice.currency)}</td>
                  <td><Status value={invoice.paymentStatus} overdue={invoice.isOverdue} /></td>
                </tr>
              ))}
              {!statement.invoices.length ? <tr><td colSpan={6} className={styles.empty}>No invoices have been created for this student.</td></tr> : null}
            </tbody>
          </table>
        </div>
      </section>

      <section className={styles.section}>
        <header>
          <div>
            <h3>Payments</h3>
            <p>Posted and reversed payments remain visible for auditability.</p>
          </div>
          <span>{statement.payments.length} records</span>
        </header>
        <div className={styles.tableWrap}>
          <table>
            <thead><tr><th>Payment</th><th>Received</th><th>Method</th><th>Allocated</th><th>Status</th></tr></thead>
            <tbody>
              {statement.payments.map((payment) => (
                <tr key={payment.id}>
                  <td><strong>{payment.paymentNumber}</strong><small>{payment.referenceNumber || "No reference"}</small></td>
                  <td>{dateLabel(payment.receivedOn)}</td>
                  <td>{title(payment.paymentMethod)}</td>
                  <td>{money(payment.allocatedMinor, payment.currency)}</td>
                  <td><Status value={payment.status} /></td>
                </tr>
              ))}
              {!statement.payments.length ? <tr><td colSpan={5} className={styles.empty}>No payments have been recorded for this student.</td></tr> : null}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}

function Status({ value, overdue = false }: { value: string; overdue?: boolean }) {
  const tone = overdue || value === "REVERSED" || value === "VOID" ? styles.danger : value === "PAID" || value === "POSTED" ? styles.success : value === "PARTIALLY_PAID" ? styles.warning : styles.neutral;
  return <span className={`${styles.badge} ${tone}`}>{overdue ? "Overdue" : title(value)}</span>;
}

function money(value: string, currency: string) {
  return formatMinorUnits(value, currency);
}
function dateLabel(value: string) {
  return new Intl.DateTimeFormat("en", { day: "2-digit", month: "short", year: "numeric" }).format(new Date(value));
}
function title(value: string) {
  return value.replaceAll("_", " ").toLowerCase().replace(/\b\w/g, (letter) => letter.toUpperCase());
}
