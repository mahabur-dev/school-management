import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { APP_GUARD } from '@nestjs/core';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import { JwtAuthGuard } from './common/guards/jwt-auth.guard';
import { RolesGuard } from './common/guards/roles.guard';
import configuration from './config/configuration';
import { PrismaModule } from './prisma';
import { AuthModule } from './modules/auth/auth.module';
import { HealthModule } from './modules/health/health.module';
import { FeaturesModule } from './modules/features/features.module';
import { SchoolsModule } from './modules/schools/schools.module';
import { SuperAdminModule } from './modules/super-admin/super-admin.module';
import { UsersModule } from './modules/users/users.module';
import { StudentsModule } from './modules/students/students.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      cache: true,
      load: [configuration],
    }),
    ThrottlerModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        throttlers: [{ ttl: 60_000, limit: 100 }],
        skipIf: () => config.getOrThrow<boolean>('app.throttleDisabled'),
      }),
    }),
    PrismaModule,
    HealthModule,
    FeaturesModule,
    AuthModule,
    UsersModule,
    StudentsModule,
    SchoolsModule,
    SuperAdminModule,
  ],
  providers: [
    // Order matters: rate limit, then authenticate, then check @Roles().
    { provide: APP_GUARD, useClass: ThrottlerGuard },
    { provide: APP_GUARD, useClass: JwtAuthGuard },
    { provide: APP_GUARD, useClass: RolesGuard },
  ],
})
export class AppModule {}
