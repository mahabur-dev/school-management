import {
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { SessionMetadata } from '../../common/types/session-metadata.type';
import { SchoolStatus, UserRole, UserStatus } from '../../prisma';
import { AuthRepository } from './auth.repository';
import { toUserResponse } from './auth.mapper';
import { LoginDto } from './dto/login.dto';
import { ResolveTenantDto } from './dto/resolve-tenant.dto';
import { PasswordService } from './password.service';
import { SessionService } from './session.service';

@Injectable()
export class AuthService {
  constructor(
    private readonly users: AuthRepository,
    private readonly passwords: PasswordService,
    private readonly sessions: SessionService,
  ) {}

  async login(dto: LoginDto, metadata: SessionMetadata) {
    const user = await this.users.findByEmail(dto.email);
    if (!user) {
      await this.passwords.burn(dto.password);
      throw new UnauthorizedException('Invalid email or password');
    }

    const validPassword = await this.passwords.compare(
      dto.password,
      user.passwordHash,
    );
    if (!validPassword || user.status !== UserStatus.ACTIVE) {
      throw new UnauthorizedException('Invalid email or password');
    }
    if (
      (dto.portal === 'PLATFORM' && user.role !== UserRole.SUPER_ADMIN) ||
      (dto.portal === 'SCHOOL' &&
        (user.role !== UserRole.SCHOOL_ADMIN ||
          !dto.tenantSlug ||
          user.school?.slug !== dto.tenantSlug))
    ) {
      throw new UnauthorizedException('Invalid email or password');
    }
    if (!user.emailVerifiedAt) {
      throw new ForbiddenException({
        message: 'Email verification is required before login',
        code: 'EMAIL_NOT_VERIFIED',
      });
    }
    // Checked after the password so the status is not revealed to guessers.
    if (user.school?.status === SchoolStatus.SUSPENDED) {
      throw new ForbiddenException({
        message: 'This school has been suspended',
        code: 'SCHOOL_SUSPENDED',
      });
    }

    await this.users.updateLastLogin(user.id);
    const session = await this.sessions.issue(user, dto.rememberMe, metadata);
    return { user: toUserResponse(user), ...session };
  }

  async resolveTenant(dto: ResolveTenantDto) {
    const schools = await this.users.findActiveSchoolsByNameOrSlug(dto.query);
    if (schools.length === 0) {
      throw new NotFoundException('School workspace not found');
    }
    if (schools.length > 1) {
      throw new ConflictException(
        'More than one school has this name. Enter its unique workspace ID.',
      );
    }
    return schools[0];
  }

  async refresh(refreshToken: string, metadata: SessionMetadata) {
    const { user, ...tokens } = await this.sessions.rotate(refreshToken, metadata);
    return { user: toUserResponse(user), ...tokens };
  }

  async logout(sessionId: string) {
    await this.sessions.revoke(sessionId);
    return { message: 'Logged out successfully' };
  }

  async logoutAll(userId: string) {
    await this.sessions.revokeAll(userId);
    return { message: 'All sessions have been revoked' };
  }

  async getMe(userId: string) {
    const user = await this.users.findById(userId);
    if (!user) throw new NotFoundException('User not found');
    return toUserResponse(user);
  }
}
