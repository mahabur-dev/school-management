import { validateEnv } from './env.validation';

const valid = {
  DATABASE_URL: 'postgresql://u:p@localhost:5432/db',
  JWT_ACCESS_SECRET: 'x'.repeat(40),
};

describe('validateEnv', () => {
  it('applies defaults', () => {
    const env = validateEnv(valid);
    expect(env.PORT).toBe(5000);
    expect(env.API_PREFIX).toBe('api/v1');
    expect(env.BCRYPT_ROUNDS).toBe(12);
    expect(env.AUTH_EXPOSE_DEVELOPMENT_TOKENS).toBe(false);
  });

  it('converts numbers and booleans from strings', () => {
    const env = validateEnv({
      ...valid,
      PORT: '8080',
      BCRYPT_ROUNDS: '11',
      AUTH_EXPOSE_DEVELOPMENT_TOKENS: 'true',
    });
    expect(env.PORT).toBe(8080);
    expect(env.BCRYPT_ROUNDS).toBe(11);
    expect(env.AUTH_EXPOSE_DEVELOPMENT_TOKENS).toBe(true);
  });

  it('treats empty optional SMTP values as unset', () => {
    const env = validateEnv({ ...valid, SMTP_HOST: '', SMTP_PORT: '' });
    expect(env.SMTP_HOST).toBeUndefined();
    expect(env.SMTP_PORT).toBeUndefined();
  });

  it('requires a database url and a long secret', () => {
    expect(() =>
      validateEnv({ JWT_ACCESS_SECRET: valid.JWT_ACCESS_SECRET }),
    ).toThrow(/DATABASE_URL/);
    expect(() =>
      validateEnv({
        DATABASE_URL: valid.DATABASE_URL,
        JWT_ACCESS_SECRET: 'short',
      }),
    ).toThrow(/JWT_ACCESS_SECRET/);
  });

  it('rejects malformed durations and bcrypt rounds', () => {
    expect(() =>
      validateEnv({ ...valid, JWT_ACCESS_EXPIRES_IN: '15 minutes' }),
    ).toThrow();
    expect(() => validateEnv({ ...valid, BCRYPT_ROUNDS: '4' })).toThrow();
  });

  describe('production', () => {
    const prod = { ...valid, NODE_ENV: 'production' };

    it('accepts a safe configuration', () => {
      expect(() => validateEnv(prod)).not.toThrow();
    });

    it('rejects placeholder secrets', () => {
      expect(() =>
        validateEnv({
          ...prod,
          JWT_ACCESS_SECRET: 'replace-with-at-least-32-random-characters',
        }),
      ).toThrow(/placeholder/);
    });

    it('rejects a disabled rate limiter', () => {
      expect(() => validateEnv({ ...prod, THROTTLE_DISABLED: 'true' })).toThrow(
        /THROTTLE_DISABLED/,
      );
    });

    it('rejects exposed development tokens and wildcard CORS', () => {
      expect(() =>
        validateEnv({ ...prod, AUTH_EXPOSE_DEVELOPMENT_TOKENS: 'true' }),
      ).toThrow(/AUTH_EXPOSE_DEVELOPMENT_TOKENS/);
      expect(() => validateEnv({ ...prod, CORS_ORIGINS: '*' })).toThrow(
        /CORS_ORIGINS/,
      );
    });
  });
});
