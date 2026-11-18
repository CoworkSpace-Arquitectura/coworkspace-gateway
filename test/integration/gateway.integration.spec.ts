import { createServer, type IncomingMessage, type Server, type ServerResponse } from 'node:http';
import type { AddressInfo } from 'node:net';
import { Test } from '@nestjs/testing';
import type { NestExpressApplication } from '@nestjs/platform-express';
import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { AppModule } from '../../src/app.module.js';
import { configureGateway } from '../../src/setup-app.js';

/**
 * Prueba de integración del Gateway: autenticación + autorización + proxy + métricas,
 * contra servicios de verdad (servidores HTTP falsos de Membership y Booking).
 */
describe('Gateway (integración)', () => {
  let app: NestExpressApplication;
  let upstream: Server;
  const seen: { path?: string; memberId?: string; role?: string } = {};

  beforeAll(async () => {
    // Un solo servidor hace de Membership (login) y de Booking (lista de reservas)
    upstream = createServer((req: IncomingMessage, res: ServerResponse) => {
      res.setHeader('Content-Type', 'application/json');
      if (req.url === '/internal/auth/verify') {
        res.end(JSON.stringify({ id: 'socio-1', name: 'Ana', email: 'ana@example.com', role: 'MEMBER' }));
        return;
      }
      seen.path = req.url;
      seen.memberId = req.headers['x-member-id'] as string;
      seen.role = req.headers['x-member-role'] as string;
      res.end(JSON.stringify([]));
    });
    await new Promise<void>((resolve) => upstream.listen(0, resolve));
    const url = `http://127.0.0.1:${(upstream.address() as AddressInfo).port}`;
    process.env.MEMBERSHIP_URL = url;
    process.env.BOOKING_URL = url;
    process.env.JWT_SECRET = 'secreto-de-prueba';

    const moduleRef = await Test.createTestingModule({ imports: [AppModule] }).compile();
    app = moduleRef.createNestApplication<NestExpressApplication>({ bodyParser: false });
    configureGateway(app);
    await app.init();
  });

  afterAll(async () => {
    await app.close();
    await new Promise((resolve) => upstream.close(resolve));
  });

  it('inicia sesión, reenvía la petición con la identidad del token e ignora la identidad falsificada', async () => {
    const server = app.getHttpServer();

    const login = await request(server)
      .post('/api/auth/login')
      .send({ email: 'ana@example.com', password: 'contrasena-segura' })
      .expect(200);
    expect(login.body.member.role).toBe('MEMBER');

    // Sin token, el Gateway responde 401 sin llegar al servicio
    await request(server).get('/api/bookings').expect(401);

    // Con token: llega a Booking con x-member-id del JWT, aunque el cliente intente falsificarlo
    await request(server)
      .get('/api/bookings')
      .set('Authorization', `Bearer ${login.body.accessToken}`)
      .set('x-member-id', 'otra-persona')
      .set('x-member-role', 'OWNER')
      .expect(200);
    expect(seen).toEqual({ path: '/bookings', memberId: 'socio-1', role: 'MEMBER' });
  });

  it('expone las métricas de Prometheus con las peticiones medidas', async () => {
    const res = await request(app.getHttpServer()).get('/metrics').expect(200);

    expect(res.text).toContain('http_requests_total');
    expect(res.text).toMatch(/http_requests_total\{[^}]*route="\/api\/bookings"[^}]*status_code="401"/);
    expect(res.text).toContain('http_request_duration_seconds_bucket');
  });
});
