import type { NextFunction, Request, Response } from 'express';
import { verifyToken } from './jwt.js';
import type { Role, ServiceRoute } from './routes.js';

function reject(res: Response, statusCode: 401 | 403, message: string) {
  res.status(statusCode).json({ statusCode, error: statusCode === 401 ? 'Unauthorized' : 'Forbidden', message });
}

export function createAuthMiddleware(route: ServiceRoute) {
  return (req: Request, res: Response, next: NextFunction) => {
    // Nadie puede hacerse pasar por otro miembro, ni subirse el rol, enviando estos encabezados
    delete req.headers['x-member-id'];
    delete req.headers['x-member-role'];

    const isRead = req.method === 'GET';
    const isPublic = (route.publicRead && isRead) || (route.publicPaths ?? []).includes(req.path);
    if (isPublic) {
      next();
      return;
    }

    const [scheme, token] = (req.headers.authorization ?? '').split(' ');
    if (scheme !== 'Bearer' || !token) {
      reject(res, 401, 'Falta el token de acceso');
      return;
    }

    let memberId: string;
    let role: Role;
    try {
      const payload = verifyToken(token);
      memberId = payload.sub;
      role = payload.role ?? 'MEMBER';
    } catch {
      reject(res, 401, 'Token inválido o vencido');
      return;
    }

    const allowed = isRead ? route.readRoles : route.writeRoles;
    if (allowed && !allowed.includes(role)) {
      reject(res, 403, 'Tu rol no tiene permiso para esta acción');
      return;
    }

    req.headers['x-member-id'] = memberId;
    req.headers['x-member-role'] = role;
    next();
  };
}