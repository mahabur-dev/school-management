import { INestApplication } from '@nestjs/common';
import { NestExpressApplication } from '@nestjs/platform-express';
import { Test } from '@nestjs/testing';
import bcrypt from 'bcrypt';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { configureApp } from '../src/app.setup';
import { PrismaService, UserRole } from '../src/prisma';

const SUPER_EMAIL = 'super@e2e.test';
const SUPER_PASSWORD = 'SuperPass#123';
const NEW_PASSWORD = 'Brand#New456';

// Response bodies are untyped JSON in these tests.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Unwrapped = { data: Record<string, any> };

describe('Auth and tenant isolation (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let http: ReturnType<typeof request>;

  let superToken: string;
  const schoolA = {
    id: '',
    adminId: '',
    email: 'admin@a.e2e.test',
    token: '',
    password: '',
  };
  const schoolB = {
    id: '',
    adminId: '',
    email: 'admin@b.e2e.test',
    token: '',
    password: '',
  };

  const login = (email: string, password: string) =>
    http.post('/api/v1/auth/login').send({ email, password });

  beforeAll(async () => {
    // Rate limiting is off here (THROTTLE_DISABLED in setup-env.ts) because
    // this flow logs in far more often than a real client would. It is
    // covered in rate-limit.e2e-spec.ts.
    const moduleRef = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();
    const nest = moduleRef.createNestApplication<NestExpressApplication>();
    configureApp(nest);
    await nest.init();
    app = nest;
    prisma = app.get(PrismaService);
    http = request(app.getHttpServer());

    await prisma.$executeRawUnsafe(
      'TRUNCATE TABLE auth_tokens, auth_sessions, users, schools RESTART IDENTITY CASCADE',
    );
    await prisma.user.create({
      data: {
        email: SUPER_EMAIL,
        passwordHash: await bcrypt.hash(SUPER_PASSWORD, 10),
        firstName: 'Super',
        lastName: 'Admin',
        role: UserRole.SUPER_ADMIN,
        emailVerifiedAt: new Date(),
      },
    });
  });

  afterAll(async () => {
    await app.close();
  });

  it('reports health', async () => {
    const res = await http.get('/api/v1/health').expect(200);
    expect(res.body).toEqual({
      success: true,
      data: { status: 'ok', database: 'up' },
    });
  });

  it('rejects unauthenticated access to protected routes', async () => {
    await http.get('/api/v1/users').expect(401);
    await http.get('/api/v1/super-admin/schools').expect(401);
    await http.get('/api/v1/auth/me').expect(401);
  });

  it('gives the same answer for unknown email and wrong password', async () => {
    const unknown = await login('nobody@e2e.test', 'Whatever#123').expect(401);
    const wrong = await login(SUPER_EMAIL, 'Wrong#Pass123').expect(401);
    expect(unknown.body.message).toBe(wrong.body.message);
  });

  it('rejects unknown body properties', async () => {
    await http
      .post('/api/v1/auth/login')
      .send({ email: SUPER_EMAIL, password: SUPER_PASSWORD, schoolId: 'x' })
      .expect(400);
  });

  it('logs the super admin in', async () => {
    const res = await login(SUPER_EMAIL, SUPER_PASSWORD).expect(200);
    const body = res.body as Unwrapped;
    expect(body.data.user).toMatchObject({
      role: 'SUPER_ADMIN',
      schoolId: null,
    });
    expect(body.data.user.passwordHash).toBeUndefined();
    superToken = body.data.accessToken;
  });

  describe('super admin creates schools', () => {
    const create = (slug: string, adminEmail: string, name = slug) =>
      http
        .post('/api/v1/super-admin/schools')
        .set('Authorization', `Bearer ${superToken}`)
        .send({
          name,
          slug,
          adminFirstName: 'Admin',
          adminLastName: name,
          adminEmail,
        });

    it('creates school A and B with temporary passwords', async () => {
      for (const [school, slug] of [
        [schoolA, 'school-a'],
        [schoolB, 'school-b'],
      ] as const) {
        const res = await create(slug, school.email, slug).expect(201);
        const { data } = res.body as Unwrapped;
        expect(data.temporaryPassword).toMatch(/.{14}/);
        expect(data.admin).toMatchObject({
          role: 'SCHOOL_ADMIN',
          mustChangePassword: true,
        });
        expect(data.admin.passwordHash).toBeUndefined();
        school.id = data.school.id;
        school.adminId = data.admin.id;
        school.password = data.temporaryPassword;
      }
    });

    it('rejects duplicate, reserved and malformed slugs and duplicate emails', async () => {
      await create('school-a', 'other@e2e.test').expect(409);
      await create('admin', 'other@e2e.test').expect(409);
      await create('Bad Slug!', 'other@e2e.test').expect(400);
      await create('school-c', schoolA.email).expect(409);
    });

    it('forbids school admins from super admin routes', async () => {
      const res = await login(schoolA.email, schoolA.password).expect(200);
      schoolA.token = (res.body as Unwrapped).data.accessToken;
      await http
        .get('/api/v1/super-admin/schools')
        .set('Authorization', `Bearer ${schoolA.token}`)
        .expect(403);
    });

    it('lists schools with pagination meta', async () => {
      const res = await http
        .get('/api/v1/super-admin/schools?limit=1')
        .set('Authorization', `Bearer ${superToken}`)
        .expect(200);
      const { data } = res.body as Unwrapped;
      expect(data.items).toHaveLength(1);
      expect(data.meta).toMatchObject({ total: 2, limit: 1, totalPages: 2 });
    });
  });

  describe('first login with a temporary password', () => {
    it('flags mustChangePassword and changes it', async () => {
      const me = await http
        .get('/api/v1/auth/me')
        .set('Authorization', `Bearer ${schoolA.token}`)
        .expect(200);
      expect((me.body as Unwrapped).data.mustChangePassword).toBe(true);

      await http
        .patch('/api/v1/auth/change-password')
        .set('Authorization', `Bearer ${schoolA.token}`)
        .send({ currentPassword: 'wrong', newPassword: NEW_PASSWORD })
        .expect(401);
      await http
        .patch('/api/v1/auth/change-password')
        .set('Authorization', `Bearer ${schoolA.token}`)
        .send({ currentPassword: schoolA.password, newPassword: 'weak' })
        .expect(400);
      await http
        .patch('/api/v1/auth/change-password')
        .set('Authorization', `Bearer ${schoolA.token}`)
        .send({ currentPassword: schoolA.password, newPassword: NEW_PASSWORD })
        .expect(200);

      // Every session ended, so the old token no longer works.
      await http
        .get('/api/v1/auth/me')
        .set('Authorization', `Bearer ${schoolA.token}`)
        .expect(401);

      schoolA.password = NEW_PASSWORD;
      const relogin = await login(schoolA.email, schoolA.password).expect(200);
      const data = (relogin.body as Unwrapped).data;
      expect(data.user.mustChangePassword).toBe(false);
      schoolA.token = data.accessToken;
    });

    it('logs school B in', async () => {
      const res = await login(schoolB.email, schoolB.password).expect(200);
      schoolB.token = (res.body as Unwrapped).data.accessToken;
    });
  });

  describe('tenant isolation', () => {
    it('lists only the callers own school users', async () => {
      const res = await http
        .get('/api/v1/users')
        .set('Authorization', `Bearer ${schoolA.token}`)
        .expect(200);
      const { items, meta } = (res.body as Unwrapped).data;
      expect(meta.total).toBe(1);
      expect(items.map((u: { id: string }) => u.id)).toEqual([schoolA.adminId]);
      expect(items[0].passwordHash).toBeUndefined();
    });

    it("returns 404 for another school's user id", async () => {
      await http
        .get(`/api/v1/users/${schoolB.adminId}`)
        .set('Authorization', `Bearer ${schoolA.token}`)
        .expect(404);
      await http
        .get(`/api/v1/users/${schoolA.adminId}`)
        .set('Authorization', `Bearer ${schoolA.token}`)
        .expect(200);
    });

    it('rejects an x-school-id header that disagrees with the token', async () => {
      await http
        .get('/api/v1/users')
        .set('Authorization', `Bearer ${schoolA.token}`)
        .set('x-school-id', schoolB.id)
        .expect(403);
    });

    it('keeps super admins out of tenant routes', async () => {
      await http
        .get('/api/v1/users')
        .set('Authorization', `Bearer ${superToken}`)
        .expect(403);
    });

    it('rejects malformed ids before touching the database', async () => {
      await http
        .get('/api/v1/users/not-a-uuid')
        .set('Authorization', `Bearer ${schoolA.token}`)
        .expect(400);
    });
  });

  describe('finance MVP security and transaction flow', () => {
    let categoryId: string;
    let studentId: string;
    let invoiceId: string;
    let paymentId: string;

    it('blocks finance while the school feature is disabled', async () => {
      await http
        .get('/api/v1/finance/invoices')
        .set('Authorization', `Bearer ${schoolA.token}`)
        .expect(403);
    });

    it('enables finance through the platform permission API', async () => {
      await http
        .patch(
          `/api/v1/super-admin/schools/${schoolA.id}/features/fee_management`,
        )
        .set('Authorization', `Bearer ${superToken}`)
        .send({ enabled: true })
        .expect(200);
      await http
        .patch(
          `/api/v1/super-admin/schools/${schoolB.id}/features/fee_management`,
        )
        .set('Authorization', `Bearer ${superToken}`)
        .send({ enabled: true })
        .expect(200);

      await http
        .get('/api/v1/finance/invoices')
        .set('Authorization', `Bearer ${schoolA.token}`)
        .expect(200);
      await http
        .get('/api/v1/finance/invoices')
        .set('Authorization', `Bearer ${superToken}`)
        .expect(403);
    });

    it('creates and issues a tenant-owned invoice', async () => {
      const category = await http
        .post('/api/v1/finance/fee-categories')
        .set('Authorization', `Bearer ${schoolA.token}`)
        .send({ code: 'TUITION', name: 'Monthly tuition' })
        .expect(201);
      categoryId = (category.body as Unwrapped).data.id;

      const student = await http
        .post('/api/v1/students')
        .set('Authorization', `Bearer ${schoolA.token}`)
        .send({ name: 'Finance Student', className: 'Eight', rollNo: 'F-1' })
        .expect(201);
      studentId = (student.body as Unwrapped).data.id;

      const invoice = await http
        .post('/api/v1/finance/invoices')
        .set('Authorization', `Bearer ${schoolA.token}`)
        .send({
          studentId,
          academicYear: '2026',
          dueDate: '2026-10-31',
          items: [
            {
              feeCategoryId: categoryId,
              description: 'October tuition',
              quantity: 1,
              unitAmountMinor: '40000',
            },
          ],
        })
        .expect(201);
      invoiceId = (invoice.body as Unwrapped).data.id;

      await http
        .post(`/api/v1/finance/invoices/${invoiceId}/issue`)
        .set('Authorization', `Bearer ${schoolA.token}`)
        .expect(201);
    });

    it('hides invoices and rejects allocations across schools', async () => {
      await http
        .get(`/api/v1/finance/invoices/${invoiceId}`)
        .set('Authorization', `Bearer ${schoolB.token}`)
        .expect(404);

      await http
        .post('/api/v1/finance/payments')
        .set('Authorization', `Bearer ${schoolB.token}`)
        .set('Idempotency-Key', 'cross-tenant-payment')
        .send({
          amountMinor: '10000',
          paymentMethod: 'CASH',
          receivedOn: '2026-10-19',
          allocations: [{ invoiceId, amountMinor: '10000' }],
        })
        .expect(404);
    });

    it('records one partial payment for identical retries', async () => {
      const payload = {
        amountMinor: '10000',
        paymentMethod: 'CASH',
        receivedOn: '2026-10-19',
        allocations: [{ invoiceId, amountMinor: '10000' }],
      };
      const first = await http
        .post('/api/v1/finance/payments')
        .set('Authorization', `Bearer ${schoolA.token}`)
        .set('Idempotency-Key', 'partial-payment-1')
        .send(payload)
        .expect(201);
      paymentId = (first.body as Unwrapped).data.id;

      const retry = await http
        .post('/api/v1/finance/payments')
        .set('Authorization', `Bearer ${schoolA.token}`)
        .set('Idempotency-Key', 'partial-payment-1')
        .send(payload)
        .expect(201);
      expect((retry.body as Unwrapped).data.id).toBe(paymentId);

      await http
        .post('/api/v1/finance/payments')
        .set('Authorization', `Bearer ${schoolA.token}`)
        .set('Idempotency-Key', 'partial-payment-1')
        .send({
          ...payload,
          amountMinor: '11000',
          allocations: [{ invoiceId, amountMinor: '11000' }],
        })
        .expect(409);

      const balance = await http
        .get(`/api/v1/finance/invoices/${invoiceId}/balance`)
        .set('Authorization', `Bearer ${schoolA.token}`)
        .expect(200);
      expect((balance.body as Unwrapped).data).toMatchObject({
        paidMinor: '10000',
        outstandingMinor: '30000',
        paymentStatus: 'PARTIALLY_PAID',
      });
    });
  });

  describe('refresh token rotation', () => {
    it('rotates once and revokes the family on reuse', async () => {
      const first = await login(schoolB.email, schoolB.password).expect(200);
      const original = (first.body as Unwrapped).data;

      const rotated = await http
        .post('/api/v1/auth/refresh')
        .send({ refreshToken: original.refreshToken })
        .expect(200);
      const next = (rotated.body as Unwrapped).data;
      expect(next.refreshToken).not.toBe(original.refreshToken);

      // Replaying the used token is treated as theft.
      await http
        .post('/api/v1/auth/refresh')
        .send({ refreshToken: original.refreshToken })
        .expect(401);
      await http
        .post('/api/v1/auth/refresh')
        .send({ refreshToken: next.refreshToken })
        .expect(401);
    });
  });

  describe('password reset', () => {
    it('resets through the two step flow and revokes sessions', async () => {
      const before = await login(schoolB.email, schoolB.password).expect(200);
      const oldToken = (before.body as Unwrapped).data.accessToken;

      const unknown = await http
        .post('/api/v1/auth/forgot-password')
        .send({ email: 'ghost@e2e.test' })
        .expect(200);
      expect(
        (unknown.body as Unwrapped).data.passwordResetCode,
      ).toBeUndefined();

      const forgot = await http
        .post('/api/v1/auth/forgot-password')
        .send({ email: schoolB.email })
        .expect(200);
      const code = (forgot.body as Unwrapped).data.passwordResetCode as string;
      expect(code).toMatch(/^\d{6}$/);

      await http
        .post('/api/v1/auth/verify-reset-otp')
        .send({
          email: schoolB.email,
          code: code === '000000' ? '111111' : '000000',
        })
        .expect(401);
      const verified = await http
        .post('/api/v1/auth/verify-reset-otp')
        .send({ email: schoolB.email, code })
        .expect(200);
      const resetToken = (verified.body as Unwrapped).data.resetToken as string;

      // A code works once.
      await http
        .post('/api/v1/auth/verify-reset-otp')
        .send({ email: schoolB.email, code })
        .expect(401);

      await http
        .post('/api/v1/auth/reset-password')
        .send({ newPassword: NEW_PASSWORD })
        .expect(401);
      await http
        .post('/api/v1/auth/reset-password')
        .set('x-password-reset-token', resetToken)
        .send({ newPassword: NEW_PASSWORD })
        .expect(200);
      await http
        .post('/api/v1/auth/reset-password')
        .set('x-password-reset-token', resetToken)
        .send({ newPassword: NEW_PASSWORD })
        .expect(401);

      await http
        .get('/api/v1/auth/me')
        .set('Authorization', `Bearer ${oldToken}`)
        .expect(401);
      await login(schoolB.email, schoolB.password).expect(401);
      const fresh = await login(schoolB.email, NEW_PASSWORD).expect(200);
      schoolB.password = NEW_PASSWORD;
      schoolB.token = (fresh.body as Unwrapped).data.accessToken;
    });
  });

  describe('suspending a school', () => {
    const setStatus = (id: string, status: string) =>
      http
        .patch(`/api/v1/super-admin/schools/${id}/status`)
        .set('Authorization', `Bearer ${superToken}`)
        .send({ status });

    it('locks out school A immediately and leaves school B alone', async () => {
      await setStatus(schoolA.id, 'SUSPENDED').expect(200);

      await http
        .get('/api/v1/users')
        .set('Authorization', `Bearer ${schoolA.token}`)
        .expect(401);
      const blocked = await login(schoolA.email, schoolA.password).expect(403);
      expect(blocked.body.code).toBe('SCHOOL_SUSPENDED');
      await login(schoolA.email, 'Wrong#Pass999').expect(401);

      await http
        .get('/api/v1/users')
        .set('Authorization', `Bearer ${schoolB.token}`)
        .expect(200);
    });

    it('restores access when reactivated', async () => {
      await setStatus(schoolA.id, 'ACTIVE').expect(200);
      await login(schoolA.email, schoolA.password).expect(200);
    });

    it('validates the status payload and id', async () => {
      await setStatus(schoolA.id, 'DELETED').expect(400);
      await setStatus('not-a-uuid', 'ACTIVE').expect(400);
      await setStatus('018f0000-0000-7000-8000-000000000000', 'ACTIVE').expect(
        404,
      );
    });
  });
});
