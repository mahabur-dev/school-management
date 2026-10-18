import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { UserRole } from '../../prisma';
import { AuthenticatedRequest } from '../types/request-context.type';

/**
 * Restricts a route to platform staff. Super admins belong to no school, so
 * this is the counterpart of TenantGuard: use one or the other per controller.
 */
@Injectable()
export class SuperAdminGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const user = context.switchToHttp().getRequest<AuthenticatedRequest>().user;
    if (!user) throw new UnauthorizedException('Authentication is required');
    if (user.role !== UserRole.SUPER_ADMIN) {
      throw new ForbiddenException('Super admin access is required');
    }
    return true;
  }
}
