import { apiRequest } from '@/lib/api/client';
import { endpoints } from '@/lib/api/endpoints';
import type { PaginatedResponse } from '@/types/api';
import type { Student } from '@/types/student';

export type StudentInput = {
  name: string;
  className: string;
  rollNo: string;
  extraData?: Record<string, unknown>;
};

export const studentsApi = {
  list: (accessToken: string, query = '') =>
    apiRequest<PaginatedResponse<Student>>(`${endpoints.students}${query}`, { accessToken }),
  create: (accessToken: string, input: StudentInput) =>
    apiRequest<Student>(endpoints.students, { method: 'POST', accessToken, body: input }),
  update: (accessToken: string, studentId: string, input: Partial<StudentInput>) =>
    apiRequest<Student>(endpoints.student(studentId), { method: 'PATCH', accessToken, body: input }),
  remove: (accessToken: string, studentId: string) =>
    apiRequest<void>(endpoints.student(studentId), { method: 'DELETE', accessToken }),
};
