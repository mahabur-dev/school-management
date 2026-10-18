import { plainToInstance, Transform, Type } from 'class-transformer';
import {
  IsBoolean,
  IsIn,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  Matches,
  Max,
  Min,
  MinLength,
  validateSync,
} from 'class-validator';

const DURATION = /^\d+(s|m|h|d)$/i;
const DURATION_MESSAGE = '$property must look like 30s, 15m, 12h or 7d';

const toBoolean = ({ value }: { value: unknown }): unknown =>
  typeof value === 'string'
    ? ['1', 'true', 'yes'].includes(value.trim().toLowerCase())
    : value;

const emptyToUndefined = ({ value }: { value: unknown }): unknown =>
  value === '' ? undefined : value;

const PLACEHOLDER_SECRETS = [
  'change-this-secret',
  'replace-with-at-least-32-random-characters',
];

/**
 * Single source of truth for environment variables: type, default and rule.
 * The app refuses to start when any rule fails.
 */
export class EnvironmentVariables {
  @IsIn(['development', 'test', 'production'])
  NODE_ENV: string = 'development';

  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(65535)
  PORT: number = 5000;

  @IsString()
  @IsNotEmpty()
  API_PREFIX: string = 'api/v1';

  @IsString()
  @IsNotEmpty()
  APP_NAME: string = 'School SaaS';

  /** Turns rate limiting off. For automated tests only; forbidden in production. */
  @Transform(toBoolean)
  @IsBoolean()
  THROTTLE_DISABLED: boolean = false;

  @IsString()
  @IsNotEmpty()
  CORS_ORIGINS: string = 'http://localhost:3000';

  @IsString()
  @Matches(/^postgres(ql)?:\/\//, {
    message: 'DATABASE_URL must be a postgresql:// connection string',
  })
  DATABASE_URL!: string;

  @IsString()
  @MinLength(32, { message: 'JWT_ACCESS_SECRET must have 32+ characters' })
  JWT_ACCESS_SECRET!: string;

  @Matches(DURATION, { message: DURATION_MESSAGE })
  JWT_ACCESS_EXPIRES_IN: string = '15m';

  @Matches(DURATION, { message: DURATION_MESSAGE })
  REFRESH_TOKEN_EXPIRES_IN: string = '7d';

  @Matches(DURATION, { message: DURATION_MESSAGE })
  REMEMBER_ME_REFRESH_TOKEN_EXPIRES_IN: string = '30d';

  @Matches(DURATION, { message: DURATION_MESSAGE })
  PASSWORD_RESET_EXPIRES_IN: string = '1h';

  @Matches(DURATION, { message: DURATION_MESSAGE })
  PASSWORD_RESET_GRANT_EXPIRES_IN: string = '15m';

  @Type(() => Number)
  @IsInt()
  @Min(10)
  @Max(15)
  BCRYPT_ROUNDS: number = 12;

  @Transform(toBoolean)
  @IsBoolean()
  AUTH_EXPOSE_DEVELOPMENT_TOKENS: boolean = false;

  @Transform(emptyToUndefined)
  @IsOptional()
  @IsString()
  SMTP_HOST?: string;

  @Transform(({ value }) =>
    value === '' || value === undefined ? undefined : Number(value),
  )
  @IsOptional()
  @IsInt()
  SMTP_PORT?: number;

  @Transform(({ value }) => (value === '' ? undefined : toBoolean({ value })))
  @IsOptional()
  @IsBoolean()
  SMTP_SECURE?: boolean;

  @Transform(emptyToUndefined)
  @IsOptional()
  @IsString()
  SMTP_USER?: string;

  @Transform(emptyToUndefined)
  @IsOptional()
  @IsString()
  SMTP_PASSWORD?: string;

  @IsString()
  @IsNotEmpty()
  MAIL_FROM: string = 'School SaaS <no-reply@example.com>';
}

export function validateEnv(
  raw: Record<string, unknown>,
): EnvironmentVariables {
  const env = plainToInstance(EnvironmentVariables, raw, {
    exposeDefaultValues: true,
    enableImplicitConversion: false,
  });

  const errors = validateSync(env, { skipMissingProperties: false });
  if (errors.length > 0) {
    const details = errors
      .flatMap((error) => Object.values(error.constraints ?? {}))
      .join('\n  - ');
    throw new Error(`Invalid environment configuration:\n  - ${details}`);
  }

  if (env.NODE_ENV === 'production') {
    const problems: string[] = [];
    if (PLACEHOLDER_SECRETS.includes(env.JWT_ACCESS_SECRET)) {
      problems.push('JWT_ACCESS_SECRET must not be a placeholder value');
    }
    if (env.AUTH_EXPOSE_DEVELOPMENT_TOKENS) {
      problems.push('AUTH_EXPOSE_DEVELOPMENT_TOKENS must be false');
    }
    if (env.THROTTLE_DISABLED) {
      problems.push('THROTTLE_DISABLED must be false');
    }
    if (env.CORS_ORIGINS.split(',').some((origin) => origin.trim() === '*')) {
      problems.push('CORS_ORIGINS must list explicit origins, not "*"');
    }
    if (problems.length > 0) {
      throw new Error(
        `Unsafe production configuration:\n  - ${problems.join('\n  - ')}`,
      );
    }
  }

  return env;
}
