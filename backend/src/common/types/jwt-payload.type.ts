import { UserRole } from '../../prisma';

export type JwtPayload = {
  sub: string;
  email: string;
  /** Null only for SUPER_ADMIN. */
  schoolId: string | null;
  role: UserRole;
  sessionId: string;
  tokenType: 'access';
};
