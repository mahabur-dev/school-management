import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { PrismaService, SchoolStatus } from '../../prisma';
import { AuthenticatedRequest } from '../types/request-context.type';

/**
 * Binds a request to exactly one school and rejects suspended schools.
 *
 * The tenant comes from the verified token (`user.schoolId`) and never from
 * request input. `x-school-id` is only accepted as a consistency check, which
 * is also where a subdomain check will plug in later.
 *
 * Use on every controller that serves tenant data:
 *   @UseGuards(TenantGuard)
 */
@Injectable()
export class TenantGuard implements CanActivate {
  constructor(private readonly prisma: PrismaService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    const user = request.user;
    if (!user) throw new UnauthorizedException('Authentication is required');
    if (!user.schoolId) {
      throw new ForbiddenException(
        'This resource is only available to school accounts',
      );
    }

    const requested = request.headers['x-school-id'];
    if (requested && requested !== user.schoolId) {
      throw new ForbiddenException('You do not have access to this school');
    }

    const school = await this.prisma.school.findUnique({
      where: { id: user.schoolId },
      select: { id: true, status: true },
    });
    if (!school) throw new UnauthorizedException('School no longer exists');
    if (school.status === SchoolStatus.SUSPENDED) {
      throw new ForbiddenException('This school has been suspended');
    }

    request.school = { id: school.id };
    return true;
  }
}
