import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import request from 'supertest';
import { AppModule } from '../src/app.module';

describe('AppController (e2e)', () => {
  let app: INestApplication;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.setGlobalPrefix('api/v1');
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
        transformOptions: { enableImplicitConversion: true },
      }),
    );
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  it('GET /api/v1 returns the welcome banner', async () => {
    const response = await request(app.getHttpServer()).get('/api/v1').expect(200);
    expect(response.body.data.name).toContain('AI Interview');
    expect(response.body.success).toBe(true);
  });

  it.each([
    ['users', '/api/v1/users/status'],
    ['resume', '/api/v1/resume/status'],
    ['interviews', '/api/v1/interviews/status'],
    ['speech', '/api/v1/speech/status'],
    ['coding', '/api/v1/coding/status'],
    ['analytics', '/api/v1/analytics/status'],
    ['achievements', '/api/v1/achievements/status'],
    ['certificates', '/api/v1/certificates/status'],
    ['leaderboard', '/api/v1/leaderboard/status'],
    ['notifications', '/api/v1/notifications/status'],
    ['admin', '/api/v1/admin/status'],
  ])('GET %s status endpoint reports the module as initialized', async (_name, path) => {
    const response = await request(app.getHttpServer()).get(path).expect(200);
    expect(response.body.data.status).toBe('initialized');
  });

  describe('Auth module (Phase 4)', () => {
    // These exercise request validation and guard behavior, which don't require
    // a live database. End-to-end flows (register -> verify -> login -> refresh)
    // need a running PostgreSQL instance and are covered by
    // test/auth.e2e-spec.ts, run separately once DATABASE_URL points at one.

    it('POST /auth/register rejects a weak password before touching the database', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/v1/auth/register')
        .send({ email: 'weak@example.com', fullName: 'Weak Password', password: 'short' })
        .expect(400);

      expect(response.body.success).toBe(false);
    });

    it('POST /auth/register rejects an invalid email', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/v1/auth/register')
        .send({ email: 'not-an-email', fullName: 'Jane Doe', password: 'StrongP@ss1' })
        .expect(400);

      expect(response.body.success).toBe(false);
    });

    it('POST /auth/login rejects an unrecognized field (whitelist validation)', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/v1/auth/login')
        .send({ email: 'jane@example.com', password: 'StrongP@ss1', notAllowed: true })
        .expect(400);

      expect(response.body.success).toBe(false);
    });

    it('POST /auth/refresh without a refresh cookie returns 401', async () => {
      const response = await request(app.getHttpServer()).post('/api/v1/auth/refresh').expect(401);
      expect(response.body.success).toBe(false);
    });
  });

  describe('Global JWT guard (Phase 4)', () => {
    it('GET /users/me without a token is rejected', async () => {
      await request(app.getHttpServer()).get('/api/v1/users/me').expect(401);
    });

    it('GET /users/me with a garbage token is rejected', async () => {
      await request(app.getHttpServer())
        .get('/api/v1/users/me')
        .set('Authorization', 'Bearer not-a-real-token')
        .expect(401);
    });

    it('@Public() status endpoints remain accessible without a token', async () => {
      await request(app.getHttpServer()).get('/api/v1/users/status').expect(200);
    });
  });
});
