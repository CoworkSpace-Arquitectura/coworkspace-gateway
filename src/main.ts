import { NestFactory } from '@nestjs/core';
import type { NestExpressApplication } from '@nestjs/platform-express';
import { AppModule } from './app.module.js';
import { configureGateway } from './setup-app.js';

// En local las variables vienen del .env; en Render, de su panel
try {
  process.loadEnvFile();
} catch {
  // no hay .env: estamos en producción
}

async function bootstrap() {
  // Sin body parser global: el Gateway reenvía el cuerpo de la petición tal cual
  const app = await NestFactory.create<NestExpressApplication>(AppModule, { bodyParser: false });
  configureGateway(app);
  await app.listen(process.env.PORT ?? 3000);
}
void bootstrap();
