export type FeeCategory = {
  id: string;
  code: string;
  name: string;
  description: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
};

export type FeeStructureItem = {
  id: string;
  feeCategoryId: string;
  description: string | null;
  amountMinor: string;
  feeCategory: { code: string; name: string };
};

export type FeeStructure = {
  id: string;
  name: string;
  className: string;
  academicYear: string;
  billingFrequency: 'MONTHLY' | 'TERM' | 'ANNUAL' | 'ONE_TIME';
  effectiveFrom: string;
  effectiveUntil: string | null;
  status: 'DRAFT' | 'ACTIVE' | 'ARCHIVED';
  items: FeeStructureItem[];
};

export type InvoiceItem = {
  id: string;
  feeCategoryId: string;
  description: string;
  quantity: number;
  unitAmountMinor: string;
  lineTotalMinor: string;
  feeCategory: { code: string; name: string };
};

export type Invoice = {
  id: string;
  studentId: string;
  feeStructureId: string | null;
  invoiceNumber: string | null;
  academicYear: string;
  billingPeriod: string | null;
  studentNameSnapshot: string | null;
  classNameSnapshot: string | null;
  issueDate: string | null;
  dueDate: string;
  currency: string;
  subtotalMinor: string;
  discountMinor: string;
  totalMinor: string;
  paidMinor: string;
  outstandingMinor: string;
  paymentStatus: InvoiceBalance['paymentStatus'];
  isOverdue: boolean;
  status: 'DRAFT' | 'ISSUED' | 'VOID';
  items: InvoiceItem[];
};

export type InvoiceBalance = {
  invoiceId: string;
  currency: string;
  invoiceStatus: Invoice['status'];
  paymentStatus: 'NOT_ISSUED' | 'VOID' | 'PAID' | 'UNPAID' | 'PARTIALLY_PAID';
  totalMinor: string;
  paidMinor: string;
  outstandingMinor: string;
  isOverdue: boolean;
};

export type Payment = {
  id: string;
  paymentNumber: string;
  amountMinor: string;
  currency: string;
  paymentMethod: 'CASH' | 'BANK_TRANSFER' | 'MOBILE_BANKING' | 'CHEQUE' | 'OTHER';
  referenceNumber: string | null;
  receivedOn: string;
  status: 'POSTED' | 'REVERSED';
  allocations: Array<{ invoiceId: string; amountMinor: string }>;
  reversal: { reason: string; createdAt: string } | null;
};

export type StudentFinanceStatement = {
  student: { id: string; name: string; className: string; rollNo: string };
  currency: string;
  summary: {
    totalInvoicedMinor: string;
    totalPaidMinor: string;
    outstandingMinor: string;
    overdueMinor: string;
  };
  invoices: Array<{
    id: string;
    invoiceNumber: string | null;
    academicYear: string;
    issueDate: string | null;
    dueDate: string;
    currency: string;
    totalMinor: string;
    paidMinor: string;
    outstandingMinor: string;
    status: Invoice['status'];
    paymentStatus: InvoiceBalance['paymentStatus'];
    isOverdue: boolean;
    items: Array<{
      id: string;
      description: string;
      quantity: number;
      lineTotalMinor: string;
      feeCategory: { code: string; name: string };
    }>;
  }>;
  payments: Array<
    Omit<Payment, 'allocations'> & { allocatedMinor: string; createdAt: string }
  >;
};
