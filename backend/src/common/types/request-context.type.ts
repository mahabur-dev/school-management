import type { Request } from 'express';
import { UserRole } from '../../prisma';

/** The authenticated principal attached to `request.user` by JwtStrategy. */
export type RequestUser = {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  /** Null only for SUPER_ADMIN. */
  schoolId: string | null;
  role: UserRole;
  sessionId: string;
};

/** The tenant attached to `request.school` by TenantGuard. */
export type RequestSchool = {
  id: string;
};

export type AuthenticatedRequest = Request & {
  user?: RequestUser;
  school?: RequestSchool;
};
