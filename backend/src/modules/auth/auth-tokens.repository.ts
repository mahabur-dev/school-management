import { Injectable } from '@nestjs/common';
import { AuthTokenType, Prisma, PrismaService } from '../../prisma';

@Injectable()
export class AuthTokensRepository {
  constructor(private readonly prisma: PrismaService) {}

  async create(input: {
    userId: string;
    type: AuthTokenType;
    tokenHash: string;
    expiresAt: Date;
  }): Promise<void> {
    await this.prisma.authToken.create({ data: input });
  }

  async invalidateActive(userId: string, type: AuthTokenType): Promise<void> {
    await this.prisma.authToken.updateMany({
      where: { userId, type, consumedAt: null },
      data: { consumedAt: new Date() },
    });
  }

  consume(tokenHash: string, type: AuthTokenType) {
    return this.claim({ tokenHash, type });
  }

  consumeForUser(userId: string, tokenHash: string, type: AuthTokenType) {
    return this.claim({ userId, tokenHash, type });
  }

  /**
   * Finds a live token and marks it consumed. The conditional update makes the
   * claim atomic: of two concurrent callers, only one gets the token.
   */
  private async claim(match: Prisma.AuthTokenWhereInput) {
    const token = await this.prisma.authToken.findFirst({
      where: { ...match, consumedAt: null, expiresAt: { gt: new Date() } },
    });
    if (!token) return null;

    const result = await this.prisma.authToken.updateMany({
      where: { id: token.id, consumedAt: null },
      data: { consumedAt: new Date() },
    });
    return result.count === 1 ? token : null;
  }
}
