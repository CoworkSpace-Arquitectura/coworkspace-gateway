import jwt from 'jsonwebtoken';
import type { Role } from './routes.js';

export interface TokenPayload {
  sub: string; // id del miembro
  email: string;
  name: string;
  role: Role;
}

// Los tokens emitidos antes de los roles no traen el campo role
export type VerifiedToken = Omit<TokenPayload, 'role'> & { role?: Role };

const secret = () => process.env.JWT_SECRET ?? 'solo-para-desarrollo-local';

export function signToken(payload: TokenPayload) {
  return jwt.sign(payload, secret(), { expiresIn: '8h' });
}

export function verifyToken(token: string) {
  return jwt.verify(token, secret()) as VerifiedToken;
}