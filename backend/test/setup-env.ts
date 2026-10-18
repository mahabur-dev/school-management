/**
 * Runs before any test module is loaded, so ConfigModule sees these values.
 * The e2e suite TRUNCATES tables: it refuses to run against a database whose
 * name does not contain "test".
 */
const url = process.env.TEST_DATABASE_URL ?? process.env.DATABASE_URL ?? '';
const databaseName = url.split('/').pop()?.split('?')[0] ?? '';

if (!/test/i.test(databaseName)) {
  throw new Error(
    `Refusing to run e2e tests against "${databaseName}". ` +
      'Set TEST_DATABASE_URL to a dedicated database whose name contains "test".',
  );
}

process.env.NODE_ENV = 'test';
process.env.DATABASE_URL = url;
process.env.JWT_ACCESS_SECRET = 'e2e-secret-e2e-secret-e2e-secret-1234';
process.env.BCRYPT_ROUNDS = '10';
process.env.AUTH_EXPOSE_DEVELOPMENT_TOKENS = 'true';
process.env.SMTP_HOST = '';
process.env.THROTTLE_DISABLED = 'true';
