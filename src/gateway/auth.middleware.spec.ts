import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { NextFunction, Request, Response } from 'express';
import { createAuthMiddleware } from './auth.middleware.js';
import { signToken } from './jwt.js';
import type { ServiceRoute } from './routes.js';

function buildRequest(method: string, path: string, headers: Record<string, string> = {}) {
  return { method, path, headers: { ...headers } } as unknown as Request;
}

describe('createAuthMiddleware', () => {
  const catalog: ServiceRoute = { prefix: '/api/locations', target: 'http://space/locations', publicRead: true };
  const bookings: ServiceRoute = {
    prefix: '/api/bookings',
    target: 'http://booking/bookings',
    publicRead: false,
    publicPaths: ['/availability'],
  };

  let res: Response;
  let status: ReturnType<typeof vi.fn>;
  let next: NextFunction;

  beforeEach(() => {
    status = vi.fn().mockReturnThis();
    res = { status, json: vi.fn() } as unknown as Response;
    next = vi.fn();
  });

  it('deja pasar sin token las consultas públicas del catálogo', () => {
    createAuthMiddleware(catalog)(buildRequest('GET', '/'), res, next);

    expect(next).toHaveBeenCalled();
  });

  it('exige token para escribir en el catálogo', () => {
    createAuthMiddleware(catalog)(buildRequest('POST', '/'), res, next);

    expect(status).toHaveBeenCalledWith(401);
    expect(next).not.toHaveBeenCalled();
  });

  it('rechaza una ruta protegida sin token', () => {
    createAuthMiddleware(bookings)(buildRequest('GET', '/'), res, next);

    expect(status).toHaveBeenCalledWith(401);
  });

  it('deja pasar las subrutas públicas de una ruta protegida', () => {
    createAuthMiddleware(bookings)(buildRequest('GET', '/availability'), res, next);

    expect(next).toHaveBeenCalled();
  });

  it('con un token válido agrega x-member-id y deja pasar', () => {
    const token = signToken({ sub: 'member-1', email: 'a@example.com', name: 'Ana' });
    const req = buildRequest('GET', '/', { authorization: `Bearer ${token}` });

    createAuthMiddleware(bookings)(req, res, next);

    expect(next).toHaveBeenCalled();
    expect(req.headers['x-member-id']).toBe('member-1');
  });

  it('rechaza un token falso', () => {
    createAuthMiddleware(bookings)(buildRequest('GET', '/', { authorization: 'Bearer token-inventado' }), res, next);

    expect(status).toHaveBeenCalledWith(401);
    expect(next).not.toHaveBeenCalled();
  });

  it('borra un x-member-id enviado por el cliente', () => {
    const req = buildRequest('GET', '/', { 'x-member-id': 'otro-miembro' });

    createAuthMiddleware(catalog)(req, res, next);

    expect(req.headers['x-member-id']).toBeUndefined();
  });
});