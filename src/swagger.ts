import type { INestApplication } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule, type OpenAPIObject } from '@nestjs/swagger';
import { buildRoutes, type ServiceRoute } from './gateway/routes.js';


function serviceName(route: ServiceRoute) {
  const tag = route.prefix.replace('/api/', '');
  const groups: Record<string, string> = {
    locations: 'Space', rooms: 'Space', desks: 'Space',
    plans: 'Membership', members: 'Membership', subscriptions: 'Membership',
    bookings: 'Booking', credentials: 'Access', access: 'Access',
    charges: 'Billing', invoices: 'Billing',
    countries: 'Currency', rates: 'Currency', convert: 'Currency',
    notifications: 'Notification', directory: 'Community', events: 'Community', messages: 'Community',
    metrics: 'Analytics', etl: 'Analytics',
  };
  return groups[tag] ?? tag;
}

function permissions(route: ServiceRoute) {
  const read = route.publicRead ? 'Lectura (GET) pública.' : `Lectura (GET): ${route.readRoles?.join(', ') ?? 'cualquier usuario con sesión'}.`;
  const write = `Escritura: ${route.writeRoles?.join(', ') ?? 'cualquier usuario con sesión'}.`;
  const open = route.publicPaths?.length ? ` Sin token: ${route.publicPaths.map((p) => route.prefix + p).join(', ')}.` : '';
  return `${read} ${write}${open}`;
}

/** Agrega al documento las rutas que el Gateway reenvía a cada microservicio. */
function addProxiedRoutes(document: OpenAPIObject) {
  for (const route of buildRoutes()) {
    const service = serviceName(route);
    const description = `Se reenvía al microservicio ${service} con los encabezados x-member-id y x-member-role. ${permissions(route)}`;
    const op = (summary: string, withId: boolean) => ({
      tags: [service],
      summary,
      description,
      security: route.publicRead && summary.startsWith('Consultar') ? [] : [{ bearer: [] }],
      ...(withId ? { parameters: [{ name: 'id', in: 'path' as const, required: true, schema: { type: 'string' } }] } : {}),
      responses: {
        '200': { description: 'Respuesta del microservicio' },
        '401': { description: 'Falta el token o venció' },
        '403': { description: 'El rol no tiene permiso' },
        '429': { description: 'Más de 100 peticiones por minuto' },
      },
    });
    document.paths[route.prefix] = {
      get: op(`Consultar (${route.prefix})`, false),
      post: op(`Crear (${route.prefix})`, false),
    };
    document.paths[`${route.prefix}/{id}`] = {
      get: op(`Consultar uno (${route.prefix}/{id})`, true),
      patch: op(`Actualizar (${route.prefix}/{id})`, true),
      delete: op(`Eliminar o cancelar (${route.prefix}/{id})`, true),
    };
  }
}

/**
 * Documentación OpenAPI del Gateway en /api/docs (JSON en /api/docs-json):
 * sus rutas propias (auth, health) y la tabla de rutas que reenvía a los microservicios.
 */
export function setupSwagger(app: INestApplication) {
  const config = new DocumentBuilder()
    .setTitle('CoworkSpace · API Gateway')
    .setDescription(
      'Única entrada al sistema. Valida el JWT (Authorization: Bearer), revisa el rol (MEMBER, MANAGER, OWNER), ' +
        'limita a 100 peticiones por minuto y reenvía cada ruta al microservicio que corresponde. ' +
        'Para probar: POST /api/auth/login, copia el token y úsalo en "Authorize".',
    )
    .setVersion('1.0')
    .addBearerAuth({ type: 'http', scheme: 'bearer', bearerFormat: 'JWT' }, 'bearer')
    .build();
  const document = SwaggerModule.createDocument(app, config);
  addProxiedRoutes(document);
  SwaggerModule.setup('api/docs', app, document);
}
