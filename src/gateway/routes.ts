export interface ServiceRoute {
  prefix: string; // ruta pública en el Gateway
  target: string; // servicio + ruta interna
  publicRead: boolean; // los GET no piden token
  publicPaths?: string[]; // subrutas que nunca piden token
}

const baseUrl = (name: string, fallback: string) => (process.env[name] ?? fallback).replace(/\/$/, '');

export function serviceBases() {
  return {
    space: baseUrl('SPACE_URL', 'http://localhost:3001'),
    membership: baseUrl('MEMBERSHIP_URL', 'http://localhost:3002'),
    access: baseUrl('ACCESS_URL', 'http://localhost:3003'),
    booking: baseUrl('BOOKING_URL', 'http://localhost:3004'),
    billing: baseUrl('BILLING_URL', 'http://localhost:3005'),
    currency: baseUrl('CURRENCY_URL', 'http://localhost:3009'),
  };
}

export function buildRoutes(): ServiceRoute[] {
  const s = serviceBases();
  return [
    { prefix: '/api/locations', target: `${s.space}/locations`, publicRead: true },
    { prefix: '/api/rooms', target: `${s.space}/rooms`, publicRead: true },
    { prefix: '/api/desks', target: `${s.space}/desks`, publicRead: true },
    { prefix: '/api/plans', target: `${s.membership}/plans`, publicRead: true },
    { prefix: '/api/members', target: `${s.membership}/members`, publicRead: false },
    { prefix: '/api/subscriptions', target: `${s.membership}/subscriptions`, publicRead: false },
    { prefix: '/api/bookings', target: `${s.booking}/bookings`, publicRead: false, publicPaths: ['/availability'] },
    { prefix: '/api/credentials', target: `${s.access}/credentials`, publicRead: false },
    { prefix: '/api/charges', target: `${s.billing}/charges`, publicRead: false },
    { prefix: '/api/invoices', target: `${s.billing}/invoices`, publicRead: false },
    { prefix: '/api/countries', target: `${s.currency}/countries`, publicRead: true },
    { prefix: '/api/rates', target: `${s.currency}/rates`, publicRead: true },
    { prefix: '/api/convert', target: `${s.currency}/convert`, publicRead: true },
  ];
}