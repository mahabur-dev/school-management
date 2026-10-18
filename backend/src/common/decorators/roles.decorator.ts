import { SetMetadata } from '@nestjs/common';
import { UserRole } from '../../prisma';

export const ROLES_KEY = 'roles';

/** Restricts a route to the listed roles (enforced by the global RolesGuard). */
export const Roles = (...roles: UserRole[]) => SetMetadata(ROLES_KEY, roles);
