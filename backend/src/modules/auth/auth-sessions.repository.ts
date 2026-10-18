import { Injectable } from '@nestjs/common';
import { SessionMetadata } from '../../common/types/session-metadata.type';
import { PrismaService } from '../../prisma';

@Injectable()
export class AuthSessionsRepository {
  constructor(private readonly prisma: PrismaService) {}

  create(input: {
    userId: string;
    familyId: string;
    refreshTokenHash: string;
    rememberMe: boolean;
    expiresAt: Date;
    metadata: SessionMetadata;
  }) {
    return this.prisma.authSession.create({
      data: {
        userId: input.userId,
        familyId: input.familyId,
        refreshTokenHash: input.refreshTokenHash,
        rememberMe: input.rememberMe,
        expiresAt: input.expiresAt,
        userAgent: input.metadata.userAgent?.slice(0, 512),
        ipAddress: input.metadata.ipAddress?.slice(0, 64),
      },
    });
  }

  findByRefreshTokenHash(refreshTokenHash: string) {
    return this.prisma.authSession.findUnique({ where: { refreshTokenHash } });
  }

  findActiveById(id: string) {
    return this.prisma.authSession.findFirst({
      where: { id, revokedAt: null, expiresAt: { gt: new Date() } },
    });
  }

  /** Atomic claim: true only for the single caller that revoked the session. */
  async revoke(id: string, reason: string): Promise<boolean> {
    const result = await this.prisma.authSession.updateMany({
      where: { id, revokedAt: null },
      data: { revokedAt: new Date(), revokeReason: reason },
    });
    return result.count === 1;
  }

  async revokeAllForUser(userId: string, reason: string): Promise<void> {
    await this.prisma.authSession.updateMany({
      where: { userId, revokedAt: null },
      data: { revokedAt: new Date(), revokeReason: reason },
    });
  }

  async revokeFamily(familyId: string, reason: string): Promise<void> {
    await this.prisma.authSession.updateMany({
      where: { familyId, revokedAt: null },
      data: { revokedAt: new Date(), revokeReason: reason },
    });
  }
}
