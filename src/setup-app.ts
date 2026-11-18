import { ValidationPipe } from '@nestjs/common';
import type { NestExpressApplication } from '@nestjs/platform-express';
import { rateLimit } from 'express-rate-limit';
import { registerProxies } from './gateway/proxy.js';
import { setupMetrics } from './metrics.js';

/** Configuración del Gateway: la usan main.ts y las pruebas de integración. */
export function configureGateway(app: NestExpressApplication) {
  app.set('trust proxy', 1);
  app.enableCors({ origin: process.env.FRONTEND_URL ?? true });

  // Primero las métricas, para medir también las peticiones que el límite rechaza
  setupMetrics(app, 'gateway');

  app.use(
    rateLimit({
      windowMs: 60_000,
      limit: Number(process.env.RATE_LIMIT_PER_MINUTE ?? 100),
      standardHeaders: 'draft-7',
      legacyHeaders: false,
      message: {
        statusCode: 429,
        error: 'Too Many Requests',
        message: 'Demasiadas peticiones. Intenta de nuevo en un minuto.',
      },
    }),
  );

  registerProxies(app);

  // Solo las rutas propias del Gateway (/api/auth, /api/health) leen JSON
  app.useBodyParser('json');
  app.setGlobalPrefix('api');
  app.useGlobalPipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true }));
  return app;
}
