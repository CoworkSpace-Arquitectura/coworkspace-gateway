import { Controller, Get } from '@nestjs/common';
import { serviceBases } from '../gateway/routes.js';

@Controller('health')
export class HealthController {
  @Get()
  async check() {
    const services = await Promise.all(
      Object.entries(serviceBases()).map(async ([name, url]) => {
        const startedAt = Date.now();
        try {
          const response = await fetch(url, { signal: AbortSignal.timeout(60_000) });
          return { service: name, status: response.ok ? 'UP' : 'DOWN', ms: Date.now() - startedAt };
        } catch (error) {
          return { service: name, status: 'DOWN', error: (error as Error).message, ms: Date.now() - startedAt };
        }
      }),
    );
    return { gateway: 'UP', services };
  }
}