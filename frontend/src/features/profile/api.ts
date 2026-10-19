import { apiRequest } from '@/lib/api/client';
import { endpoints } from '@/lib/api/endpoints';
import type { CurrentUser, SchoolProfile } from '@/types/auth';

export type PersonalProfileInput = {
  firstName: string;
  lastName: string;
  phoneNumber: string | null;
};

export type SchoolProfileInput = Pick<
  SchoolProfile,
  | 'name'
  | 'contactEmail'
  | 'phoneNumber'
  | 'websiteUrl'
  | 'addressLine1'
  | 'addressLine2'
  | 'city'
  | 'stateOrProvince'
  | 'postalCode'
  | 'country'
>;

export const profileApi = {
  updatePersonal: (accessToken: string, input: PersonalProfileInput) =>
    apiRequest<CurrentUser>(endpoints.auth.me, {
      method: 'PATCH',
      accessToken,
      body: input,
    }),
  updateSchool: (accessToken: string, input: SchoolProfileInput) =>
    apiRequest<SchoolProfile>(endpoints.schoolProfile, {
      method: 'PATCH',
      accessToken,
      body: input,
    }),
  changePassword: (
    accessToken: string,
    input: { currentPassword: string; newPassword: string },
  ) =>
    apiRequest<{ message: string }>(endpoints.auth.changePassword, {
      method: 'PATCH',
      accessToken,
      body: input,
    }),
};
