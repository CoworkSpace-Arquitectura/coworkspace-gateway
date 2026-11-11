import type { NextFunction, Request, Response } from 'express';
import { verifyToken } from './jwt.js';
import type { ServiceRoute } from './routes.js';

function unauthorized(res: Response, message: string) {
  res.status(401).json({ statusCode: 401, error: 'Unauthorized', message });
}

export function createAuthMiddleware(route: ServiceRoute) {
  return (req: Request, res: Response, next: NextFunction) => {
    // Nadie puede hacerse pasar por otro miembro enviando este encabezado
    delete req.headers['x-member-id'];

    const isPublic =
      (route.publicRead && req.method === 'GET') || (route.publicPaths ?? []).includes(req.path);
    if (isPublic) {
      next();
      return;
    }

    const [scheme, token] = (req.headers.authorization ?? '').split(' ');
    if (scheme !== 'Bearer' || !token) {
      unauthorized(res, 'Falta el token de acceso');
      return;
    }

    try {
      const payload = verifyToken(token);
      req.headers['x-member-id'] = payload.sub;
      next();
    } catch {
      unauthorized(res, 'Token inválido o vencido');
    }
  };
}