import jwt from 'jsonwebtoken';

export interface TokenPayload {
  sub: string; // id del miembro
  email: string;
  name: string;
}

const secret = () => process.env.JWT_SECRET ?? 'solo-para-desarrollo-local';

export function signToken(payload: TokenPayload) {
  return jwt.sign(payload, secret(), { expiresIn: '8h' });
}

export function verifyToken(token: string) {
  return jwt.verify(token, secret()) as TokenPayload;
}