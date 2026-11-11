import { ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import type { NestExpressApplication } from '@nestjs/platform-express';
import { rateLimit } from 'express-rate-limit';
import { AppModule } from './app.module.js';
import { registerProxies } from './gateway/proxy.js';

// En local las variables vienen del .env; en Render, de su panel
try {
  process.loadEnvFile();
} catch {
  // no hay .env: estamos en producción
}

async function bootstrap() {
  // Sin body parser global: el Gateway reenvía el cuerpo de la petición tal cual
  const app = await NestFactory.create<NestExpressApplication>(AppModule, { bodyParser: false });
  app.set('trust proxy', 1);
  app.enableCors({ origin: process.env.FRONTEND_URL ?? true });

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

  await app.listen(process.env.PORT ?? 3000);
}
void bootstrap();