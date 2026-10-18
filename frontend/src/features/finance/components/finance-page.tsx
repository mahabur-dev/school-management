"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { AppIcon } from "@/components/ui/app-icon";
import { OptionSelect } from "@/components/ui/option-select";
import { PageHeader } from "@/components/ui/page-header";
import { useToast } from "@/components/ui/toast";
import { studentsApi } from "@/features/students/api";
import { featuresApi } from "@/features/features/api";
import { ApiError } from "@/lib/api/error";
import { session } from "@/lib/auth/session";
import { formatMinorUnits, toMinorUnits } from "@/lib/finance/money";
import type { ConfiguredField } from "@/types/feature";
import type { FeeCategory, FeeStructure, Invoice, InvoiceBalance, Payment } from "@/types/finance";
import type { Student } from "@/types/student";
import { financeApi, type FeeCategoryInput, type FeeStructureInput, type InvoiceInput, type PaymentInput } from "../api";
import styles from "./finance-page.module.css";

type FinanceTab = "overview" | "categories" | "structures" | "invoices" | "payments";
type Dialog = "category" | "structure" | "invoice" | "payment" | null;
type InvoiceDocumentAction = "download" | "print";

const tabs: Array<{ id: FinanceTab; label: string }> = [
  { id: "overview", label: "Overview" },
  { id: "categories", label: "Fee categories" },
  { id: "structures", label: "Fee structures" },
  { id: "invoices", label: "Invoices" },
  { id: "payments", label: "Payments" },
];

export function FinancePage() {
  const token = session.get()?.accessToken;
  const toast = useToast();
  const [tab, setTab] = useState<FinanceTab>("overview");
  const [dialog, setDialog] = useState<Dialog>(null);
  const [categories, setCategories] = useState<FeeCategory[]>([]);
  const [structures, setStructures] = useState<FeeStructure[]>([]);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [studentsLoading, setStudentsLoading] = useState(true);
  const [financeFields, setFinanceFields] = useState<ConfiguredField[]>([]);
  const [balances, setBalances] = useState<Record<string, InvoiceBalance>>({});
  const [detail, setDetail] = useState<Invoice | null>(null);
  const [reversingPayment, setReversingPayment] = useState<Payment | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [documentAction, setDocumentAction] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    setError(null);
    try {
      const [nextCategories, nextStructures, nextInvoices, nextPayments, nextFields] = await Promise.all([
        financeApi.categories(token),
        financeApi.structures(token),
        financeApi.invoices(token),
        financeApi.payments(token),
        featuresApi.myFields(token, "fee_management"),
      ]);
      setCategories(nextCategories);
      setStructures(nextStructures);
      setInvoices(nextInvoices);
      setPayments(nextPayments);
      setFinanceFields(nextFields);
      setBalances(Object.fromEntries(nextInvoices.map((invoice) => [invoice.id, {
        invoiceId: invoice.id,
        currency: invoice.currency,
        invoiceStatus: invoice.status,
        paymentStatus: invoice.paymentStatus,
        totalMinor: invoice.totalMinor,
        paidMinor: invoice.paidMinor,
        outstandingMinor: invoice.outstandingMinor,
        isOverdue: invoice.isOverdue,
      }])));
    } catch (caught) {
      setError(message(caught, "Finance information could not be loaded."));
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    const timer = window.setTimeout(() => void refresh(), 0);
    return () => window.clearTimeout(timer);
  }, [refresh]);

  useEffect(() => {
    if (!token) return;
    let active = true;
    studentsApi
      .list(token, "?page=1&limit=100")
      .then((response) => {
        if (active) setStudents(response.items);
      })
      .catch(() => {
        if (active) toast.error("Student list could not be loaded.");
      })
      .finally(() => {
        if (active) setStudentsLoading(false);
      });
    return () => {
      active = false;
    };
  }, [toast, token]);

  async function run(action: () => Promise<void>, success: string) {
    try {
      await action();
      await refresh();
      toast.success(success);
    } catch (caught) {
      toast.error(message(caught, "The finance action could not be completed."));
    }
  }

  async function handleInvoiceDocument(
    invoice: Invoice,
    action: InvoiceDocumentAction,
  ) {
    if (!token) return;
    const actionKey = `${invoice.id}:${action}`;
    const printWindow =
      action === "print" ? window.open("about:blank", "_blank") : null;
    if (action === "print" && !printWindow) {
      toast.error("Allow pop-ups to print this invoice.");
      return;
    }
    if (printWindow) {
      printWindow.opener = null;
      printWindow.document.write(
        "<title>Preparing invoice</title><p style='font:14px system-ui;padding:24px'>Preparing secure invoice…</p>",
      );
    }
    setDocumentAction(actionKey);
    try {
      const blob = await financeApi.invoicePdf(token, invoice.id);
      const url = URL.createObjectURL(blob);
      if (action === "download") {
        const anchor = document.createElement("a");
        anchor.href = url;
        anchor.download = `${safeDocumentName(invoice.invoiceNumber ?? `draft-${invoice.id.slice(0, 8)}`)}.pdf`;
        document.body.appendChild(anchor);
        anchor.click();
        anchor.remove();
        window.setTimeout(() => URL.revokeObjectURL(url), 1_000);
        toast.success("Invoice PDF downloaded.");
      } else if (printWindow) {
        printWindow.location.replace(url);
        window.setTimeout(() => {
          printWindow.focus();
          printWindow.print();
        }, 1_000);
        window.setTimeout(() => URL.revokeObjectURL(url), 60_000);
      }
    } catch (caught) {
      printWindow?.close();
      toast.error(message(caught, "Invoice PDF could not be generated."));
    } finally {
      setDocumentAction(null);
    }
  }

  const totals = useMemo(() => {
    const issued = invoices.filter((invoice) => invoice.status === "ISSUED");
    const totalInvoiced = issued.reduce((sum, invoice) => sum + BigInt(invoice.totalMinor), 0n);
    const collected = payments.filter((payment) => payment.status === "POSTED").reduce((sum, payment) => sum + BigInt(payment.amountMinor), 0n);
    const outstanding = Object.values(balances).reduce((sum, balance) => sum + BigInt(balance.outstandingMinor), 0n);
    const overdue = Object.values(balances).filter((balance) => balance.isOverdue).reduce((sum, balance) => sum + BigInt(balance.outstandingMinor), 0n);
    return { totalInvoiced, collected, outstanding, overdue };
  }, [balances, invoices, payments]);

  return (
    <main className={styles.page}>
      <PageHeader
        eyebrow="Finance management"
        title="Finance workspace"
        description="Manage fee policies, invoices, payments, and outstanding balances from one secure workspace."
        action={<button className={styles.primaryButton} onClick={() => setDialog("payment")} type="button"><AppIcon name="plus" /> Record payment</button>}
      />
      <nav className={styles.tabs} aria-label="Finance sections">
        {tabs.map((item) => <button className={tab === item.id ? styles.tabActive : styles.tab} key={item.id} onClick={() => setTab(item.id)} type="button">{item.label}</button>)}
      </nav>
      {error ? <div className={styles.error}>{error}<button onClick={() => void refresh()} type="button">Try again</button></div> : null}
      {loading ? <section className={styles.loading}>Loading finance workspace…</section> : null}
      {!loading && tab === "overview" ? <Overview totals={totals} invoices={invoices} payments={payments} balances={balances} setTab={setTab} /> : null}
      {!loading && tab === "categories" ? <Categories categories={categories} onAdd={() => setDialog("category")} onStatus={(category) => token && void run(() => financeApi.setCategoryStatus(token, category.id, !category.isActive).then(() => undefined), `${category.name} was ${category.isActive ? "deactivated" : "activated"}.`)} /> : null}
      {!loading && tab === "structures" ? <Structures structures={structures} onAdd={() => setDialog("structure")} onActivate={(structure) => token && void run(() => financeApi.activateStructure(token, structure.id).then(() => undefined), "Fee structure activated.")} onArchive={(structure) => token && void run(() => financeApi.archiveStructure(token, structure.id).then(() => undefined), "Fee structure archived.")} /> : null}
      {!loading && tab === "invoices" ? <Invoices invoices={invoices} balances={balances} documentAction={documentAction} onAdd={() => setDialog("invoice")} onDetail={setDetail} onDownload={(invoice) => void handleInvoiceDocument(invoice, "download")} onIssue={(invoice) => token && void run(() => financeApi.issueInvoice(token, invoice.id).then(() => undefined), "Invoice issued.")} onVoid={(invoice) => token && void run(() => financeApi.voidInvoice(token, invoice.id).then(() => undefined), "Invoice voided.")} /> : null}
      {!loading && tab === "payments" ? <Payments payments={payments} onAdd={() => setDialog("payment")} onReverse={setReversingPayment} /> : null}
      {dialog === "category" && token ? <CategoryDialog onClose={() => setDialog(null)} onSave={(input) => run(async () => { await financeApi.createCategory(token, input); setDialog(null); }, "Fee category created.")} /> : null}
      {dialog === "structure" && token ? <StructureDialog categories={categories} onClose={() => setDialog(null)} onSave={(input) => run(async () => { await financeApi.createStructure(token, input); setDialog(null); }, "Fee structure created.")} /> : null}
      {dialog === "invoice" && token ? <InvoiceDialog categories={categories} structures={structures} fields={financeFields} students={students} studentsLoading={studentsLoading} onClose={() => setDialog(null)} onSave={(input) => run(async () => { await financeApi.createInvoice(token, input); setDialog(null); }, "Invoice draft created.")} /> : null}
      {dialog === "payment" && token ? <PaymentDialog invoices={invoices} balances={balances} fields={financeFields} students={students} studentsLoading={studentsLoading} onClose={() => setDialog(null)} onSave={(input) => run(async () => { await financeApi.recordPayment(token, input, crypto.randomUUID()); setDialog(null); }, "Payment recorded securely.")} /> : null}
      {detail ? <InvoiceDetails invoice={detail} balance={balances[detail.id]} documentAction={documentAction} onClose={() => setDetail(null)} onDocument={(action) => void handleInvoiceDocument(detail, action)} /> : null}
      {reversingPayment && token ? <ReversePaymentDialog payment={reversingPayment} onClose={() => setReversingPayment(null)} onSave={(reason) => run(async () => { await financeApi.reversePayment(token, reversingPayment.id, reason); setReversingPayment(null); }, "Payment reversed.")} /> : null}
    </main>
  );
}

function Overview({ totals, invoices, payments, balances, setTab }: { totals: Record<"totalInvoiced" | "collected" | "outstanding" | "overdue", bigint>; invoices: Invoice[]; payments: Payment[]; balances: Record<string, InvoiceBalance>; setTab: (tab: FinanceTab) => void }) {
  const metrics = [["Invoiced", totals.totalInvoiced, "Issued invoice value"], ["Collected", totals.collected, "Posted payments"], ["Outstanding", totals.outstanding, "Open invoice balances"], ["Overdue", totals.overdue, "Past due balances"]] as const;
  return <div className={styles.overview}><section className={styles.metrics}>{metrics.map(([label, value, note], index) => <article className={`${styles.metric} ${index === 3 && value > 0n ? styles.dangerMetric : ""}`} key={label}><span>{label}</span><strong>{money(value)}</strong><small>{note}</small></article>)}</section><section className={styles.twoColumns}><article className={styles.card}><SectionTitle title="Recent invoices" action="View invoices" onAction={() => setTab("invoices")} />{invoices.slice(0, 5).map((invoice) => <div className={styles.activityRow} key={invoice.id}><span><strong>{invoice.invoiceNumber ?? "Draft invoice"}</strong><small>{invoice.studentNameSnapshot ?? "Student pending issue"}</small></span><span><strong>{money(invoice.totalMinor)}</strong><small className={statusClass(invoice.status)}>{invoice.status}</small></span></div>)}{!invoices.length ? <Empty copy="No invoices created yet." /> : null}</article><article className={styles.card}><SectionTitle title="Recent payments" action="View payments" onAction={() => setTab("payments")} />{payments.slice(0, 5).map((payment) => <div className={styles.activityRow} key={payment.id}><span><strong>{payment.paymentNumber}</strong><small>{methodLabel(payment.paymentMethod)} · {dateLabel(payment.receivedOn)}</small></span><span><strong>{money(payment.amountMinor)}</strong><small className={statusClass(payment.status)}>{payment.status}</small></span></div>)}{!payments.length ? <Empty copy="No payments have been recorded." /> : null}</article></section></div>;
}

function Categories({ categories, onAdd, onStatus }: { categories: FeeCategory[]; onAdd: () => void; onStatus: (category: FeeCategory) => void }) {
  return <section className={styles.card}><div className={styles.toolbar}><div><h2>Fee categories</h2><p>Reusable charge types for invoices and fee structures.</p></div><button className={styles.secondaryButton} onClick={onAdd} type="button"><AppIcon name="plus" /> Add category</button></div><table className={styles.table}><thead><tr><th>Category</th><th>Code</th><th>Description</th><th>Status</th><th /></tr></thead><tbody>{categories.map((category) => <tr key={category.id}><td><strong>{category.name}</strong></td><td><code>{category.code}</code></td><td>{category.description || "—"}</td><td><Badge tone={category.isActive ? "success" : "neutral"}>{category.isActive ? "Active" : "Inactive"}</Badge></td><td><button className={styles.textButton} onClick={() => onStatus(category)} type="button">{category.isActive ? "Deactivate" : "Activate"}</button></td></tr>)}{!categories.length ? <tr><td colSpan={5}><Empty copy="Create your first fee category to begin." /></td></tr> : null}</tbody></table></section>;
}

function Structures({ structures, onAdd, onActivate, onArchive }: { structures: FeeStructure[]; onAdd: () => void; onActivate: (structure: FeeStructure) => void; onArchive: (structure: FeeStructure) => void }) {
  return <section className={styles.card}><div className={styles.toolbar}><div><h2>Fee structures</h2><p>Class-specific fee policies with a controlled activation lifecycle.</p></div><button className={styles.secondaryButton} onClick={onAdd} type="button"><AppIcon name="plus" /> New structure</button></div><table className={styles.table}><thead><tr><th>Structure</th><th>Class</th><th>Frequency</th><th>Charges</th><th>Status</th><th /></tr></thead><tbody>{structures.map((structure) => <tr key={structure.id}><td><strong>{structure.name}</strong><small>{structure.academicYear} · effective {dateLabel(structure.effectiveFrom)}</small></td><td>{structure.className}</td><td>{title(structure.billingFrequency)}</td><td>{money(structure.items.reduce((sum, item) => sum + BigInt(item.amountMinor), 0n))}</td><td><Badge tone={structure.status === "ACTIVE" ? "success" : structure.status === "DRAFT" ? "warning" : "neutral"}>{title(structure.status)}</Badge></td><td>{structure.status === "DRAFT" ? <button className={styles.textButton} onClick={() => onActivate(structure)} type="button">Activate</button> : structure.status === "ACTIVE" ? <button className={styles.textButton} onClick={() => onArchive(structure)} type="button">Archive</button> : null}</td></tr>)}{!structures.length ? <tr><td colSpan={6}><Empty copy="Create a class fee structure after adding categories." /></td></tr> : null}</tbody></table></section>;
}

function Invoices({ invoices, balances, documentAction, onAdd, onDetail, onDownload, onIssue, onVoid }: { invoices: Invoice[]; balances: Record<string, InvoiceBalance>; documentAction: string | null; onAdd: () => void; onDetail: (invoice: Invoice) => void; onDownload: (invoice: Invoice) => void; onIssue: (invoice: Invoice) => void; onVoid: (invoice: Invoice) => void }) {
  return <section className={styles.card}><div className={styles.toolbar}><div><h2>Invoices</h2><p>Draft, issue, and monitor individual student invoices.</p></div><button className={styles.secondaryButton} onClick={onAdd} type="button"><AppIcon name="plus" /> Create invoice</button></div><table className={styles.table}><thead><tr><th>Invoice</th><th>Student</th><th>Due date</th><th>Total</th><th>Outstanding</th><th>Status</th><th>Actions</th></tr></thead><tbody>{invoices.map((invoice) => <tr key={invoice.id}><td><strong>{invoice.invoiceNumber ?? "Draft"}</strong><small>{invoice.academicYear}</small></td><td>{invoice.studentNameSnapshot ?? "Will be captured when issued"}</td><td>{dateLabel(invoice.dueDate)}</td><td>{money(invoice.totalMinor)}</td><td>{invoice.status === "ISSUED" ? money(balances[invoice.id]?.outstandingMinor ?? "0") : "—"}</td><td><Badge tone={invoice.status === "ISSUED" ? "success" : invoice.status === "DRAFT" ? "warning" : "neutral"}>{title(invoice.status)}</Badge></td><td className={styles.actionCell}><button className={styles.textButton} onClick={() => onDetail(invoice)} type="button">View</button><button className={styles.textButton} disabled={documentAction === `${invoice.id}:download`} onClick={() => onDownload(invoice)} type="button">{documentAction === `${invoice.id}:download` ? "Preparing…" : "PDF"}</button>{invoice.status === "DRAFT" ? <button className={styles.textButton} onClick={() => onIssue(invoice)} type="button">Issue</button> : null}{invoice.status === "ISSUED" && balances[invoice.id]?.paidMinor === "0" ? <button className={styles.dangerButton} onClick={() => onVoid(invoice)} type="button">Void</button> : null}</td></tr>)}{!invoices.length ? <tr><td colSpan={7}><Empty copy="Create an invoice for an enrolled student." /></td></tr> : null}</tbody></table></section>;
}

function Payments({ payments, onAdd, onReverse }: { payments: Payment[]; onAdd: () => void; onReverse: (payment: Payment) => void }) {
  return <section className={styles.card}><div className={styles.toolbar}><div><h2>Payment history</h2><p>Posted payments are immutable; corrections create a traceable reversal.</p></div><button className={styles.secondaryButton} onClick={onAdd} type="button"><AppIcon name="plus" /> Record payment</button></div><table className={styles.table}><thead><tr><th>Payment</th><th>Received</th><th>Method</th><th>Allocated invoices</th><th>Amount</th><th>Status</th><th /></tr></thead><tbody>{payments.map((payment) => <tr key={payment.id}><td><strong>{payment.paymentNumber}</strong><small>{payment.referenceNumber || "No reference"}</small></td><td>{dateLabel(payment.receivedOn)}</td><td>{methodLabel(payment.paymentMethod)}</td><td>{payment.allocations.length}</td><td>{money(payment.amountMinor)}</td><td><Badge tone={payment.status === "POSTED" ? "success" : "neutral"}>{title(payment.status)}</Badge></td><td>{payment.status === "POSTED" ? <button className={styles.dangerButton} onClick={() => onReverse(payment)} type="button">Reverse</button> : null}</td></tr>)}{!payments.length ? <tr><td colSpan={7}><Empty copy="No payments have been recorded." /></td></tr> : null}</tbody></table></section>;
}

function CategoryDialog({ onClose, onSave }: { onClose: () => void; onSave: (input: FeeCategoryInput) => Promise<void> }) { const [saving, setSaving] = useState(false); return <Dialog title="Add fee category" subtitle="Fee configuration" onClose={onClose}><form onSubmit={async (event) => { event.preventDefault(); const form = new FormData(event.currentTarget); setSaving(true); try { await onSave({ code: String(form.get("code")), name: String(form.get("name")), description: String(form.get("description")) || undefined }); } finally { setSaving(false); } }}><Field label="Category name"><input name="name" placeholder="Monthly tuition" required /></Field><Field label="Code"><input name="code" placeholder="TUITION" required /></Field><Field label="Description"><textarea name="description" placeholder="Optional internal description" /></Field><DialogFooter saving={saving} onClose={onClose} label="Create category" /></form></Dialog>; }

function StructureDialog({ categories, onClose, onSave }: { categories: FeeCategory[]; onClose: () => void; onSave: (input: FeeStructureInput) => Promise<void> }) { const [categoryId, setCategoryId] = useState(""); const [frequency, setFrequency] = useState("MONTHLY"); const [saving, setSaving] = useState(false); return <Dialog title="New fee structure" subtitle="Fee configuration" onClose={onClose}><form onSubmit={async (event) => { event.preventDefault(); const form = new FormData(event.currentTarget); if (!categoryId) return; setSaving(true); try { await onSave({ name: String(form.get("name")), className: String(form.get("className")), academicYear: String(form.get("academicYear")), billingFrequency: frequency as FeeStructure["billingFrequency"], effectiveFrom: String(form.get("effectiveFrom")), effectiveUntil: null, items: [{ feeCategoryId: categoryId, amountMinor: toMinorUnits(String(form.get("amountMinor"))), description: String(form.get("description")) || undefined }] }); } finally { setSaving(false); } }}><div className={styles.formGrid}><Field label="Structure name"><input name="name" placeholder="Grade 8 monthly fees" required /></Field><Field label="Class"><input name="className" placeholder="Grade 8" required /></Field><Field label="Academic year"><input name="academicYear" defaultValue="2026" required /></Field><Field label="Effective from"><input name="effectiveFrom" type="date" required /></Field></div><Field label="Billing frequency"><OptionSelect ariaLabel="Billing frequency" onChange={setFrequency} options={frequencyOptions} placeholder="Select frequency" value={frequency} /></Field><Field label="Fee category"><OptionSelect ariaLabel="Fee category" onChange={setCategoryId} options={categories.filter((item) => item.isActive).map((item) => ({ value: item.id, label: `${item.name} · ${item.code}` }))} placeholder="Select active category" value={categoryId} /></Field><div className={styles.formGrid}><Field label="Amount (BDT)"><input min="0.01" step="0.01" name="amountMinor" placeholder="5000" required type="number" /></Field><Field label="Line description"><input name="description" placeholder="Monthly tuition fee" /></Field></div><DialogFooter disabled={!categoryId} saving={saving} onClose={onClose} label="Create structure" /></form></Dialog>; }

function InvoiceDialog({ categories, structures, fields, students, studentsLoading, onClose, onSave }: { categories: FeeCategory[]; structures: FeeStructure[]; fields: ConfiguredField[]; students: Student[]; studentsLoading: boolean; onClose: () => void; onSave: (input: InvoiceInput) => Promise<void> }) {
  const [studentId, setStudentId] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [structureId, setStructureId] = useState("");
  const [extraData, setExtraData] = useState<Record<string, unknown>>({});
  const [saving, setSaving] = useState(false);
  const billingPeriod = fields.find((field) => field.key === "invoice_billing_period");
  const metadata = fields.filter((field) => field.enabled && !field.isCore && field.key.startsWith("invoice_") && field.key !== "invoice_billing_period");
  return <Dialog title="Create invoice" subtitle="Invoice management" onClose={onClose}><form onSubmit={async (event) => {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    if (!studentId || (!categoryId && !structureId)) return;
    const structure = structures.find((item) => item.id === structureId);
    setSaving(true);
    try {
      await onSave({
        studentId,
        ...(structure ? { feeStructureId: structure.id } : {}),
        academicYear: String(form.get("academicYear")),
        dueDate: String(form.get("dueDate")),
        ...(billingPeriod?.enabled && form.get("billingPeriod") ? { billingPeriod: String(form.get("billingPeriod")) } : {}),
        discountMinor: "0",
        extraData,
        items: structure
          ? structure.items.map((item) => ({ feeCategoryId: item.feeCategoryId, description: item.description || item.feeCategory.name, quantity: 1, unitAmountMinor: item.amountMinor }))
          : [{ feeCategoryId: categoryId, description: String(form.get("description")), quantity: 1, unitAmountMinor: toMinorUnits(String(form.get("amountMinor"))) }],
      });
    } finally { setSaving(false); }
  }}><Field label="Student"><OptionSelect ariaLabel="Student" onChange={setStudentId} options={students.map(studentOption)} placeholder={studentsLoading ? "Loading students…" : "Select student"} value={studentId} /></Field>{!studentsLoading && students.length === 0 ? <div className={styles.hint}>No students are available in this school workspace.</div> : null}<div className={styles.formGrid}><Field label="Academic year"><input name="academicYear" defaultValue="2026" required /></Field><Field label="Due date"><input name="dueDate" type="date" required /></Field>{billingPeriod?.enabled ? <Field label={billingPeriod.label}><input name="billingPeriod" required={billingPeriod.required} type="date" /></Field> : null}</div><Field label="Active fee structure (optional)"><OptionSelect ariaLabel="Active fee structure" onChange={(value) => { setStructureId(value); if (value) setCategoryId(""); }} options={structures.filter((item) => item.status === "ACTIVE").map((item) => ({ value: item.id, label: `${item.name} · ${item.className}` }))} placeholder="Create a manual invoice" value={structureId} /></Field>{structureId ? <div className={styles.hint}>All charges from the selected fee structure will be copied into this invoice.</div> : <><Field label="Fee category"><OptionSelect ariaLabel="Invoice fee category" onChange={setCategoryId} options={categories.filter((item) => item.isActive).map((item) => ({ value: item.id, label: item.name }))} placeholder="Select fee category" value={categoryId} /></Field><div className={styles.formGrid}><Field label="Amount (BDT)"><input min="0.01" step="0.01" name="amountMinor" required type="number" /></Field><Field label="Description"><input name="description" placeholder="Monthly tuition" required /></Field></div></>}<FinanceMetadataFields fields={metadata} values={extraData} onChange={setExtraData} /><DialogFooter disabled={!studentId || (!categoryId && !structureId)} saving={saving} onClose={onClose} label="Save draft" /></form></Dialog>;
}

function PaymentDialog({ invoices, balances, fields, students, studentsLoading, onClose, onSave }: { invoices: Invoice[]; balances: Record<string, InvoiceBalance>; fields: ConfiguredField[]; students: Student[]; studentsLoading: boolean; onClose: () => void; onSave: (input: PaymentInput) => Promise<void> }) {
  const [studentId, setStudentId] = useState("");
  const [amounts, setAmounts] = useState<Record<string, string>>({});
  const [method, setMethod] = useState<Payment["paymentMethod"]>("CASH");
  const [extraData, setExtraData] = useState<Record<string, unknown>>({});
  const [saving, setSaving] = useState(false);
  const reference = fields.find((field) => field.key === "payment_reference");
  const metadata = fields.filter((field) => field.enabled && !field.isCore && field.key.startsWith("payment_") && field.key !== "payment_reference");
  const outstandingInvoices = invoices.filter((invoice) => invoice.status === "ISSUED" && BigInt(balances[invoice.id]?.outstandingMinor ?? "0") > 0n);
  const studentInvoices = outstandingInvoices.filter((invoice) => invoice.studentId === studentId);
  const hasAllocation = Object.values(amounts).some((amount) => Number(amount) > 0);
  return <Dialog title="Record payment" subtitle="Payment management" onClose={onClose}><form onSubmit={async (event) => {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const allocations = studentInvoices.flatMap((invoice) => amounts[invoice.id] && Number(amounts[invoice.id]) > 0 ? [{ invoiceId: invoice.id, amountMinor: toMinorUnits(amounts[invoice.id]) }] : []);
    if (!studentId || !allocations.length) return;
    const amountMinor = allocations.reduce((sum, allocation) => sum + BigInt(allocation.amountMinor), 0n).toString();
    setSaving(true);
    try { await onSave({ amountMinor, paymentMethod: method, receivedOn: String(form.get("receivedOn")), ...(reference?.enabled ? { referenceNumber: String(form.get("referenceNumber")) || undefined } : {}), extraData, allocations }); } finally { setSaving(false); }
  }}><Field label="Student"><OptionSelect ariaLabel="Student" onChange={(value) => { setStudentId(value); setAmounts({}); }} options={students.map(studentOption)} placeholder={studentsLoading ? "Loading students…" : "Select student"} value={studentId} /></Field>{!studentsLoading && students.length === 0 ? <div className={styles.paymentNotice}>No students are available in this school workspace.</div> : null}{studentId && studentInvoices.length === 0 ? <div className={styles.paymentNotice}><strong>No payable invoice found</strong><span>This student needs an issued invoice with an outstanding balance before a payment can be recorded.</span></div> : null}{studentInvoices.length > 0 ? <div className={styles.allocationList}><div className={styles.allocationHeader}><strong>Invoice allocations</strong><span>Enter full or partial amounts</span></div>{studentInvoices.map((invoice) => <label className={styles.allocationRow} key={invoice.id}><span><strong>{invoice.invoiceNumber}</strong><small>Outstanding {money(balances[invoice.id].outstandingMinor)}</small></span><input aria-label={`Allocation for ${invoice.invoiceNumber}`} max={Number(balances[invoice.id].outstandingMinor) / 100} min="0" step="0.01" type="number" value={amounts[invoice.id] ?? ""} onChange={(event) => setAmounts({ ...amounts, [invoice.id]: event.target.value })} placeholder="0.00" /></label>)}</div> : null}<div className={styles.formGrid}><Field label="Received on"><input defaultValue={today()} name="receivedOn" required type="date" /></Field><Field label="Payment method"><OptionSelect ariaLabel="Payment method" onChange={(value) => setMethod(value as Payment["paymentMethod"])} options={paymentMethods} placeholder="Select method" value={method} /></Field></div>{reference?.enabled ? <Field label={reference.label}><input name="referenceNumber" placeholder="Optional transaction reference" required={reference.required} /></Field> : null}<FinanceMetadataFields fields={metadata} values={extraData} onChange={setExtraData} /><DialogFooter disabled={!studentId || !hasAllocation} saving={saving} onClose={onClose} label="Record payment" /></form></Dialog>;
}

function ReversePaymentDialog({ payment, onClose, onSave }: { payment: Payment; onClose: () => void; onSave: (reason: string) => Promise<void> }) {
  const [saving, setSaving] = useState(false);
  return <Dialog title={`Reverse ${payment.paymentNumber}`} subtitle="Controlled correction" onClose={onClose}><form onSubmit={async (event) => { event.preventDefault(); const reason = String(new FormData(event.currentTarget).get("reason")).trim(); if (reason.length < 3) return; setSaving(true); try { await onSave(reason); } finally { setSaving(false); } }}><p className={styles.hint}>The original payment will remain in the audit history and its allocations will stop counting toward invoice balances.</p><Field label="Reversal reason"><textarea name="reason" minLength={3} maxLength={2000} required placeholder="Explain why this payment is being reversed" /></Field><DialogFooter saving={saving} onClose={onClose} label="Reverse payment" /></form></Dialog>;
}

function InvoiceDetails({ invoice, balance, documentAction, onClose, onDocument }: { invoice: Invoice; balance?: InvoiceBalance; documentAction: string | null; onClose: () => void; onDocument: (action: InvoiceDocumentAction) => void }) { const downloading = documentAction === `${invoice.id}:download`; const printing = documentAction === `${invoice.id}:print`; return <Dialog title={invoice.invoiceNumber ?? "Invoice draft"} subtitle="Invoice details" onClose={onClose}><div className={styles.detailGrid}><span>Student<strong>{invoice.studentNameSnapshot ?? "Captured when issued"}</strong></span><span>Due date<strong>{dateLabel(invoice.dueDate)}</strong></span><span>Total<strong>{money(invoice.totalMinor)}</strong></span><span>Outstanding<strong>{balance ? money(balance.outstandingMinor) : "—"}</strong></span></div><div className={styles.lineItems}>{invoice.items.map((item) => <div key={item.id}><span><strong>{item.description}</strong><small>{item.feeCategory.name} · Qty {item.quantity}</small></span><strong>{money(item.lineTotalMinor)}</strong></div>)}</div><div className={styles.documentActions}><button disabled={Boolean(documentAction)} onClick={() => onDocument("print")} type="button"><AppIcon name="printer" />{printing ? "Preparing…" : "Print invoice"}</button><button disabled={Boolean(documentAction)} onClick={() => onDocument("download")} type="button"><AppIcon name="download" />{downloading ? "Preparing…" : "Download PDF"}</button></div><DialogFooter onClose={onClose} label="Close" secondaryOnly /></Dialog>; }

function Dialog({ title, subtitle, onClose, children }: { title: string; subtitle: string; onClose: () => void; children: React.ReactNode }) { return <div className={styles.backdrop}><section aria-modal="true" className={styles.dialog} role="dialog"><header><div><span>{subtitle}</span><h2>{title}</h2></div><button aria-label="Close dialog" onClick={onClose} type="button"><AppIcon name="x" /></button></header>{children}</section></div>; }
function DialogFooter({ onClose, label, saving = false, disabled = false, secondaryOnly = false }: { onClose: () => void; label: string; saving?: boolean; disabled?: boolean; secondaryOnly?: boolean }) { return <footer className={styles.dialogFooter}><button onClick={onClose} type="button">{secondaryOnly ? label : "Cancel"}</button>{!secondaryOnly ? <button disabled={disabled || saving} type="submit">{saving ? "Saving…" : label}</button> : null}</footer>; }
function Field({ label, children }: { label: string; children: React.ReactNode }) { return <label className={styles.field}><span>{label}</span>{children}</label>; }
function FinanceMetadataFields({ fields, values, onChange }: { fields: ConfiguredField[]; values: Record<string, unknown>; onChange: (values: Record<string, unknown>) => void }) {
  return <div className={styles.formGrid}>{fields.map((field) => <Field key={field.key} label={field.label}><input type={field.type === "date" ? "date" : field.type === "number" ? "number" : "text"} required={field.required} value={String(values[field.key] ?? "")} onChange={(event) => { const next = { ...values }; if (event.target.value) next[field.key] = field.type === "number" ? Number(event.target.value) : event.target.value; else delete next[field.key]; onChange(next); }} /></Field>)}</div>;
}
function SectionTitle({ title, action, onAction }: { title: string; action: string; onAction: () => void }) { return <header className={styles.sectionTitle}><div><h2>{title}</h2><p>Latest activity in this workspace</p></div><button onClick={onAction} type="button">{action}</button></header>; }
function Badge({ children, tone }: { children: React.ReactNode; tone: "success" | "warning" | "neutral" }) { return <span className={`${styles.badge} ${styles[tone]}`}>{children}</span>; }
function Empty({ copy }: { copy: string }) { return <p className={styles.empty}>{copy}</p>; }

const frequencyOptions = ["MONTHLY", "TERM", "ANNUAL", "ONE_TIME"].map((value) => ({ value, label: title(value) }));
const paymentMethods = ["CASH", "BANK_TRANSFER", "MOBILE_BANKING", "CHEQUE", "OTHER"].map((value) => ({ value, label: methodLabel(value) }));
function studentOption(student: Student) { return { value: student.id, label: `${student.name} · ${student.className} · Roll ${student.rollNo}` }; }
function money(amount: bigint | string) { return formatMinorUnits(amount); }
function dateLabel(value: string) { return new Intl.DateTimeFormat("en", { day: "2-digit", month: "short", year: "numeric" }).format(new Date(value)); }
function methodLabel(value: string) { return title(value).replace("MOBILE BANKING", "Mobile banking").replace("BANK TRANSFER", "Bank transfer"); }
function title(value: string) { return value.replaceAll("_", " ").toLowerCase().replace(/\b\w/g, (letter) => letter.toUpperCase()); }
function statusClass(status: string) { return status === "POSTED" || status === "ISSUED" ? styles.successText : status === "DRAFT" ? styles.warningText : styles.mutedText; }
function today() { return new Date().toISOString().slice(0, 10); }
function safeDocumentName(value: string) { return value.replace(/[^a-zA-Z0-9._-]+/g, "-").replace(/^-+|-+$/g, "") || "invoice"; }
function message(caught: unknown, fallback: string) { return caught instanceof ApiError ? caught.message : fallback; }
