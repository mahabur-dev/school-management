import { AuthUser } from './auth.repository';

/** The only shape of a user that auth endpoints return. */
export function toUserResponse(user: AuthUser) {
  return {
    id: user.id,
    schoolId: user.schoolId,
    school: user.school,
    firstName: user.firstName,
    lastName: user.lastName,
    email: user.email,
    phoneNumber: user.phoneNumber,
    role: user.role,
    status: user.status,
    mustChangePassword: user.mustChangePassword,
    emailVerified: Boolean(user.emailVerifiedAt),
    lastLoginAt: user.lastLoginAt,
  };
}
