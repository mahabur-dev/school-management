import { Injectable, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaPg } from '@prisma/adapter-pg';
import { Prisma, PrismaClient } from '../generated/prisma/client';
import { scopeArgs, TENANT_MODELS } from './tenant-scope';

@Injectable()
export class PrismaService
  extends PrismaClient
  implements OnModuleInit, OnModuleDestroy
{
  constructor(config: ConfigService) {
    super({
      adapter: new PrismaPg({
        connectionString: config.getOrThrow<string>('database.url'),
      }),
    });
  }

  async onModuleInit(): Promise<void> {
    await this.$connect();
  }

  async onModuleDestroy(): Promise<void> {
    await this.$disconnect();
  }

  /**
   * A client locked to one school. Use this in every repository that reads or
   * writes tenant data. The plain service (`this.prisma`) is unscoped and is
   * reserved for auth lookups, super-admin work and tenant-less tables.
   */
  forSchool(schoolId: string) {
    return this.$extends(
      Prisma.defineExtension({
        name: 'school-scope',
        query: {
          $allModels: {
            $allOperations({ model, operation, args, query }) {
              if (!TENANT_MODELS.has(model)) return query(args);
              return query(
                scopeArgs(operation, args as Record<string, unknown>, schoolId),
              );
            },
          },
        },
      }),
    );
  }
}
