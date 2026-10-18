import { INestApplication } from '@nestjs/common';
import { NestExpressApplication } from '@nestjs/platform-express';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { configureApp } from '../src/app.setup';

describe('Rate limiting (e2e)', () => {
  let app: INestApplication;

  beforeAll(async () => {
    process.env.THROTTLE_DISABLED = 'false';
    const moduleRef = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();
    const nest = moduleRef.createNestApplication<NestExpressApplication>();
    configureApp(nest);
    await nest.init();
    app = nest;
  });

  afterAll(async () => {
    process.env.THROTTLE_DISABLED = 'true';
    await app.close();
  });

  it('blocks the 11th login attempt within a minute', async () => {
    const http = request(app.getHttpServer());
    const attempt = () =>
      http
        .post('/api/v1/auth/login')
        .send({ email: 'nobody@rate.test', password: 'Whatever#123' });

    for (let i = 0; i < 10; i++) await attempt().expect(401);
    await attempt().expect(429);
  });
});
