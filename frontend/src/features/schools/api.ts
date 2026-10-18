import { apiRequest } from '@/lib/api/client';
import { endpoints } from '@/lib/api/endpoints';
import type { PaginatedResponse } from '@/types/api';
import type {
  CreateSchoolInput,
  CreateSchoolResponse,
  School,
  SchoolStatus,
} from '@/types/school';

export const schoolsApi = {
  list: (accessToken: string, query = '') =>
    apiRequest<PaginatedResponse<School>>(`${endpoints.superAdmin.schools}${query}`, {
      accessToken,
    }),
  create: (accessToken: string, input: CreateSchoolInput) =>
    apiRequest<CreateSchoolResponse>(endpoints.superAdmin.schools, {
      method: 'POST',
      accessToken,
      body: input,
    }),
  updateStatus: (accessToken: string, schoolId: string, status: SchoolStatus) =>
    apiRequest<School>(endpoints.superAdmin.schoolStatus(schoolId), {
      method: 'PATCH',
      accessToken,
      body: { status },
    }),
};
