export const endpoints = {
  auth: {
    login: '/auth/login',
    resolveTenant: '/auth/resolve-tenant',
    refresh: '/auth/refresh',
    logout: '/auth/logout',
    me: '/auth/me',
    changePassword: '/auth/change-password',
  },
  schoolProfile: '/schools/me',
  superAdmin: {
    schools: '/super-admin/schools',
    school: (schoolId: string) => `/super-admin/schools/${schoolId}`,
    schoolStatus: (schoolId: string) =>
      `/super-admin/schools/${schoolId}/status`,
    features: '/super-admin/features',
    schoolFeature: (schoolId: string, key: string) =>
      `/super-admin/schools/${schoolId}/features/${key}`,
    schoolFeatureFields: (schoolId: string, key: string) =>
      `/super-admin/schools/${schoolId}/features/${key}/fields`,
  },
  // These routes will be enabled when the matching backend modules are built.
  features: {
    mine: '/me/features',
    studentFields: '/me/features/student_management/fields',
    fields: (key: string) => `/me/features/${key}/fields`,
  },
  students: '/students',
  student: (studentId: string) => `/students/${studentId}`,
  finance: {
    categories: '/finance/fee-categories',
    category: (categoryId: string) => `/finance/fee-categories/${categoryId}`,
    categoryStatus: (categoryId: string) =>
      `/finance/fee-categories/${categoryId}/status`,
    structures: '/finance/fee-structures',
    structure: (structureId: string) => `/finance/fee-structures/${structureId}`,
    structureActivate: (structureId: string) =>
      `/finance/fee-structures/${structureId}/activate`,
    structureArchive: (structureId: string) =>
      `/finance/fee-structures/${structureId}/archive`,
    invoices: '/finance/invoices',
    invoice: (invoiceId: string) => `/finance/invoices/${invoiceId}`,
    invoiceIssue: (invoiceId: string) =>
      `/finance/invoices/${invoiceId}/issue`,
    invoiceVoid: (invoiceId: string) => `/finance/invoices/${invoiceId}/void`,
    invoiceBalance: (invoiceId: string) =>
      `/finance/invoices/${invoiceId}/balance`,
    invoicePdf: (invoiceId: string) =>
      `/finance/invoices/${invoiceId}/pdf`,
    invoicePayments: (invoiceId: string) =>
      `/finance/invoices/${invoiceId}/payments`,
    payments: '/finance/payments',
    payment: (paymentId: string) => `/finance/payments/${paymentId}`,
    paymentReverse: (paymentId: string) =>
      `/finance/payments/${paymentId}/reverse`,
    studentStatement: (studentId: string) =>
      `/finance/students/${studentId}/statement`,
  },
} as const;
