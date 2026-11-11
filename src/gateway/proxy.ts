import type { INestApplication } from '@nestjs/common';
import { createProxyMiddleware } from 'http-proxy-middleware';
import { buildRoutes } from './routes.js';
import { createAuthMiddleware } from './auth.middleware.js';

export function registerProxies(app: INestApplication) {
  for (const route of buildRoutes()) {
    app.use(
      route.prefix,
      createAuthMiddleware(route),
      createProxyMiddleware({
        target: route.target,
        changeOrigin: true,
        proxyTimeout: 60_000, // Render puede tardar en despertar un servicio
      }),
    );
  }
}