# CoworkSpace · API Gateway

![CI-CD](https://github.com/CoworkSpace-Arquitectura/coworkspace-gateway/actions/workflows/deploy.yml/badge.svg)

Única entrada al sistema. Valida el JWT, revisa el rol (MEMBER, MANAGER, OWNER) de cada ruta, limita a 100 peticiones por minuto y reenvía la petición al microservicio que corresponde con los encabezados x-member-id y x-member-role.

- **Despliegue:** https://coworkspace-gateway.onrender.com
- **Documentación de la API (Swagger):** https://coworkspace-gateway.onrender.com/api/docs
- **Autenticación:** `POST /api/auth/register`, `POST /api/auth/login`, `GET /api/auth/me`
- **Estado de los servicios:** `GET /api/health`
- **Públicas (GET):** `/api/locations`, `/api/rooms`, `/api/desks`, `/api/plans`, `/api/countries`, `/api/rates`, `/api/convert`, `/api/bookings/availability`
- **Con token:** `/api/members`, `/api/subscriptions`, `/api/bookings`, `/api/credentials`, `/api/charges`, `/api/invoices`, y cualquier escritura
- **Puerto local:** 3000

## Tecnologías

TypeScript, NestJS 12 y Node.js 24, JWT y http-proxy-middleware, Vitest y Supertest para pruebas, prom-client para métricas y @nestjs/swagger para la documentación. Se empaqueta con Docker.

## Instalación y ejecución local

```bash
npm install
cp .env.example .env        # en Windows: copy .env.example .env
npm run start:dev           # http://localhost:3000
```

Producción: `npm run build` y `node dist/main.js` (o la imagen Docker del `Dockerfile`).

## Variables de entorno

Están en `.env.example`. El archivo `.env` real no se sube al repositorio (está en `.gitignore`); en Render se configuran como variables de entorno y en GitHub Actions como *secrets*.

| Variable | Para qué sirve | Ejemplo |
| --- | --- | --- |
| `PORT` | Puerto HTTP | `3000` |
| `JWT_SECRET` | Clave para firmar los JWT (usa una cadena larga y aleatoria) | `cambia-esta-clave` |
| `FRONTEND_URL` | Origen permitido por CORS (el sitio web) | `http://localhost:3010` |
| `RATE_LIMIT_PER_MINUTE` | Límite de peticiones por minuto | `100` |
| `SPACE_URL` | Direcciones de los microservicios | `http://localhost:3001` |
| `MEMBERSHIP_URL` | Direcciones de los microservicios | `http://localhost:3002` |
| `ACCESS_URL` | Direcciones de los microservicios | `http://localhost:3003` |
| `BOOKING_URL` | Direcciones de los microservicios | `http://localhost:3004` |
| `BILLING_URL` | Direcciones de los microservicios | `http://localhost:3005` |
| `COMMUNITY_URL` | Direcciones de los microservicios | `http://localhost:3006` |
| `NOTIFICATION_URL` | Direcciones de los microservicios | `http://localhost:3007` |
| `ANALYTICS_URL` | Direcciones de los microservicios | `http://localhost:3008` |
| `CURRENCY_URL` | Direcciones de los microservicios | `http://localhost:3009` |

## Endpoints

Rutas propias. Además reenvía las rutas de los microservicios (`/api/locations`, `/api/bookings`, `/api/charges`…); la lista completa con permisos está en Swagger.

| Método | Ruta |
| --- | --- |
| POST | `/auth/register` |
| POST | `/auth/login` |
| GET | `/auth/me` |
| GET | `/health` |
| GET | `/metrics` (métricas para Prometheus) |
| GET | `/api/docs` (Swagger UI) |

## Pruebas

Pruebas unitarias en `src/**/*.spec.ts` (con mocks de la base, de otros servicios y de las APIs externas) y una prueba de integración en `test/integration/` con un servicio falso detrás del Gateway.

```bash
npx vitest run --exclude "test/**"   # solo unitarias, sin base de datos
npm test                              # unitarias + integración (requiere DATABASE_URL)
npm run test:cov                      # con reporte de cobertura (carpeta coverage/)
```

En GitHub Actions las pruebas corren contra PostgreSQL 16 y Redis 7 reales, y el reporte de cobertura queda como artefacto `cobertura-gateway`.

## CI/CD

`.github/workflows/deploy.yml` se ejecuta en cada push y pull request a `main` y llama al workflow reutilizable de [coworkspace-pipelines](https://github.com/CoworkSpace-Arquitectura/coworkspace-pipelines): lint, build, pruebas con cobertura → imagen Docker en GHCR → despliegue en Render. Si una prueba falla, no se construye la imagen ni se despliega. Los pull requests solo corren las pruebas.

## Monitoreo

`GET /metrics` expone métricas para Prometheus (peticiones por ruta y código, histograma de tiempos de respuesta y métricas del proceso). La configuración de Prometheus y el dashboard de Grafana están en `coworkspace-pipelines/monitoring`.
