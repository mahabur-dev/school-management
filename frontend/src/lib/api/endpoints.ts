export const endpoints = {
  auth: {
    login: '/auth/login',
    resolveTenant: '/auth/resolve-tenant',
    refresh: '/auth/refresh',
    logout: '/auth/logout',
    me: '/auth/me',
  },
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
  },
  students: '/students',
  student: (studentId: string) => `/students/${studentId}`,
} as const;
