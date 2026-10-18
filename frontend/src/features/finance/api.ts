import { apiBlobRequest, apiRequest } from '@/lib/api/client';
import { endpoints } from '@/lib/api/endpoints';
import type { FeeCategory, FeeStructure, Invoice, InvoiceBalance, Payment, StudentFinanceStatement } from '@/types/finance';

export type FeeCategoryInput = Pick<FeeCategory, 'code' | 'name'> & { description?: string };
export type FeeStructureInput = Omit<FeeStructure, 'id' | 'status' | 'items'> & {
  items: Array<{ feeCategoryId: string; description?: string; amountMinor: string }>;
};
export type InvoiceInput = {
  studentId: string;
  feeStructureId?: string;
  academicYear: string;
  billingPeriod?: string;
  dueDate: string;
  discountMinor?: string;
  extraData?: Record<string, unknown>;
  items: Array<{ feeCategoryId: string; description: string; quantity: number; unitAmountMinor: string }>;
};
export type PaymentInput = {
  amountMinor: string;
  paymentMethod: Payment['paymentMethod'];
  receivedOn: string;
  referenceNumber?: string;
  allocations: Array<{ invoiceId: string; amountMinor: string }>;
  extraData?: Record<string, unknown>;
};

export const financeApi = {
  categories: (accessToken: string) => apiRequest<FeeCategory[]>(endpoints.finance.categories, { accessToken }),
  createCategory: (accessToken: string, input: FeeCategoryInput) => apiRequest<FeeCategory>(endpoints.finance.categories, { method: 'POST', accessToken, body: input }),
  updateCategory: (accessToken: string, id: string, input: Partial<FeeCategoryInput>) => apiRequest<FeeCategory>(endpoints.finance.category(id), { method: 'PATCH', accessToken, body: input }),
  setCategoryStatus: (accessToken: string, id: string, isActive: boolean) => apiRequest<FeeCategory>(endpoints.finance.categoryStatus(id), { method: 'PATCH', accessToken, body: { isActive } }),
  structures: (accessToken: string) => apiRequest<FeeStructure[]>(endpoints.finance.structures, { accessToken }),
  createStructure: (accessToken: string, input: FeeStructureInput) => apiRequest<FeeStructure>(endpoints.finance.structures, { method: 'POST', accessToken, body: input }),
  activateStructure: (accessToken: string, id: string) => apiRequest<FeeStructure>(endpoints.finance.structureActivate(id), { method: 'POST', accessToken }),
  archiveStructure: (accessToken: string, id: string) => apiRequest<FeeStructure>(endpoints.finance.structureArchive(id), { method: 'POST', accessToken }),
  invoices: (accessToken: string) => apiRequest<Invoice[]>(endpoints.finance.invoices, { accessToken }),
  createInvoice: (accessToken: string, input: InvoiceInput) => apiRequest<Invoice>(endpoints.finance.invoices, { method: 'POST', accessToken, body: input }),
  issueInvoice: (accessToken: string, id: string) => apiRequest<Invoice>(endpoints.finance.invoiceIssue(id), { method: 'POST', accessToken }),
  voidInvoice: (accessToken: string, id: string) => apiRequest<Invoice>(endpoints.finance.invoiceVoid(id), { method: 'POST', accessToken }),
  balance: (accessToken: string, id: string) => apiRequest<InvoiceBalance>(endpoints.finance.invoiceBalance(id), { accessToken }),
  invoicePdf: (accessToken: string, id: string) =>
    apiBlobRequest(endpoints.finance.invoicePdf(id), { accessToken }),
  payments: (accessToken: string) => apiRequest<Payment[]>(endpoints.finance.payments, { accessToken }),
  recordPayment: (accessToken: string, input: PaymentInput, idempotencyKey: string) => apiRequest<Payment>(endpoints.finance.payments, { method: 'POST', accessToken, headers: { 'Idempotency-Key': idempotencyKey }, body: input }),
  reversePayment: (accessToken: string, id: string, reason: string) => apiRequest<{ paymentId: string; status: 'REVERSED' }>(endpoints.finance.paymentReverse(id), { method: 'POST', accessToken, body: { reason } }),
  studentStatement: (accessToken: string, studentId: string) =>
    apiRequest<StudentFinanceStatement>(endpoints.finance.studentStatement(studentId), { accessToken }),
};
