import { parseDurationToSeconds } from '../common/helpers/duration.helper';
import { validateEnv } from './env.validation';

/**
 * Typed, validated application config. Read it with
 * `config.getOrThrow<string>('jwt.accessSecret')`.
 */
export default () => {
  const env = validateEnv(process.env);

  return {
    app: {
      env: env.NODE_ENV,
      isProduction: env.NODE_ENV === 'production',
      name: env.APP_NAME,
      port: env.PORT,
      apiPrefix: env.API_PREFIX,
      throttleDisabled: env.THROTTLE_DISABLED,
    },
    cors: {
      origins: env.CORS_ORIGINS.split(',')
        .map((origin) => origin.trim())
        .filter(Boolean),
    },
    database: {
      url: env.DATABASE_URL,
    },
    jwt: {
      accessSecret: env.JWT_ACCESS_SECRET,
      accessExpiresIn: parseDurationToSeconds(env.JWT_ACCESS_EXPIRES_IN),
    },
    auth: {
      refreshExpiresIn: parseDurationToSeconds(env.REFRESH_TOKEN_EXPIRES_IN),
      rememberMeRefreshExpiresIn: parseDurationToSeconds(
        env.REMEMBER_ME_REFRESH_TOKEN_EXPIRES_IN,
      ),
      passwordResetExpiresIn: parseDurationToSeconds(
        env.PASSWORD_RESET_EXPIRES_IN,
      ),
      passwordResetGrantExpiresIn: parseDurationToSeconds(
        env.PASSWORD_RESET_GRANT_EXPIRES_IN,
      ),
      bcryptRounds: env.BCRYPT_ROUNDS,
      exposeDevelopmentTokens: env.AUTH_EXPOSE_DEVELOPMENT_TOKENS,
    },
    mail: {
      host: env.SMTP_HOST,
      port: env.SMTP_PORT ?? 587,
      secure: env.SMTP_SECURE ?? env.SMTP_PORT === 465,
      user: env.SMTP_USER,
      password: env.SMTP_PASSWORD,
      from: env.MAIL_FROM,
    },
  };
};
