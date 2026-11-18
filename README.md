# CoworkSpace · API Gateway

![CI-CD](https://github.com/CoworkSpace-Arquitectura/coworkspace-gateway/actions/workflows/deploy.yml/badge.svg)

Punto de entrada único del sistema. Enruta cada petición al microservicio correspondiente, valida los tokens JWT y limita a 100 peticiones por minuto por IP.

- **Autenticación:** `POST /api/auth/register`, `POST /api/auth/login`, `GET /api/auth/me`
- **Estado de los servicios:** `GET /api/health`
- **Públicas (GET):** `/api/locations`, `/api/rooms`, `/api/desks`, `/api/plans`, `/api/countries`, `/api/rates`, `/api/convert`, `/api/bookings/availability`
- **Con token:** `/api/members`, `/api/subscriptions`, `/api/bookings`, `/api/credentials`, `/api/charges`, `/api/invoices`, y cualquier escritura
- **Puerto local:** 3000

## Documentación de la API

- Swagger UI desplegado: https://coworkspace-gateway.onrender.com/api/docs
- Incluye las rutas propias (`/api/auth`, `/api/health`) y todas las rutas que el Gateway reenvía a los microservicios, con sus permisos.
- En local: http://localhost:3000/api/docs (el JSON OpenAPI está en `/api/docs-json`).
