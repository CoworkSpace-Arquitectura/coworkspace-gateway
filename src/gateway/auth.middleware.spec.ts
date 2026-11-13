import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { NextFunction, Request, Response } from 'express';
import { createAuthMiddleware } from './auth.middleware.js';
import { signToken } from './jwt.js';
import type { Role, ServiceRoute } from './routes.js';

function buildRequest(method: string, path: string, headers: Record<string, string> = {}) {
  return { method, path, headers: { ...headers } } as unknown as Request;
}

const bearer = (role: Role) => ({
  authorization: `Bearer ${signToken({ sub: 'member-1', email: 'a@example.com', name: 'Ana', role })}`,
});

describe('createAuthMiddleware', () => {
  const catalog: ServiceRoute = { prefix: '/api/locations', target: 'http://space/locations', publicRead: true, writeRoles: ['MANAGER', 'OWNER'] };
  const plans: ServiceRoute = { prefix: '/api/plans', target: 'http://membership/plans', publicRead: true, writeRoles: ['OWNER'] };
  const members: ServiceRoute = {
    prefix: '/api/members',
    target: 'http://membership/members',
    publicRead: false,
    readRoles: ['MANAGER', 'OWNER'],
    writeRoles: ['OWNER'],
  };
  const bookings: ServiceRoute = { prefix: '/api/bookings', target: 'http://booking/bookings', publicRead: false, publicPaths: ['/availability'] };

  let res: Response;
  let status: ReturnType<typeof vi.fn>;
  let next: NextFunction;

  beforeEach(() => {
    status = vi.fn().mockReturnThis();
    res = { status, json: vi.fn() } as unknown as Response;
    next = vi.fn();
  });

  it('deja ver el catálogo sin token', () => {
    createAuthMiddleware(catalog)(buildRequest('GET', '/'), res, next);

    expect(next).toHaveBeenCalled();
  });

  it('pide token para modificar el catálogo', () => {
    createAuthMiddleware(catalog)(buildRequest('POST', '/'), res, next);

    expect(status).toHaveBeenCalledWith(401);
  });

  it('un miembro no puede crear sedes', () => {
    createAuthMiddleware(catalog)(buildRequest('POST', '/', bearer('MEMBER')), res, next);

    expect(status).toHaveBeenCalledWith(403);
    expect(next).not.toHaveBeenCalled();
  });

  it('un gerente sí puede crear sedes y el servicio recibe su rol', () => {
    const req = buildRequest('POST', '/', bearer('MANAGER'));

    createAuthMiddleware(catalog)(req, res, next);

    expect(next).toHaveBeenCalled();
    expect(req.headers['x-member-role']).toBe('MANAGER');
  });

  it('solo el jefe crea planes', () => {
    createAuthMiddleware(plans)(buildRequest('POST', '/', bearer('MANAGER')), res, next);
    expect(status).toHaveBeenCalledWith(403);

    createAuthMiddleware(plans)(buildRequest('POST', '/', bearer('OWNER')), res, next);
    expect(next).toHaveBeenCalled();
  });

  it('un miembro no puede ver la lista de miembros, un gerente sí', () => {
    createAuthMiddleware(members)(buildRequest('GET', '/', bearer('MEMBER')), res, next);
    expect(status).toHaveBeenCalledWith(403);

    createAuthMiddleware(members)(buildRequest('GET', '/', bearer('MANAGER')), res, next);
    expect(next).toHaveBeenCalled();
  });

  it('deja pasar las subrutas públicas de una ruta protegida', () => {
    createAuthMiddleware(bookings)(buildRequest('GET', '/availability'), res, next);

    expect(next).toHaveBeenCalled();
  });

  it('rechaza un token falso', () => {
    createAuthMiddleware(bookings)(buildRequest('GET', '/', { authorization: 'Bearer token-inventado' }), res, next);

    expect(status).toHaveBeenCalledWith(401);
  });

  it('borra la identidad y el rol que intente enviar el cliente', () => {
    const req = buildRequest('GET', '/', { 'x-member-id': 'otro', 'x-member-role': 'OWNER' });

    createAuthMiddleware(catalog)(req, res, next);

    expect(req.headers['x-member-id']).toBeUndefined();
    expect(req.headers['x-member-role']).toBeUndefined();
  });
});