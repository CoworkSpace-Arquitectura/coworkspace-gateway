import { ConflictException, Injectable, ServiceUnavailableException, UnauthorizedException } from '@nestjs/common';
import { signToken } from '../gateway/jwt.js';
import { serviceBases } from '../gateway/routes.js';
import type { Role } from '../gateway/routes.js';
import { LoginDto, RegisterDto } from './dto/auth.dto.js';

export interface Member {
  id: string;
  name: string;
  email: string;
  role: Role;
}

@Injectable()
export class AuthService {
  async register(dto: RegisterDto) {
    const response = await this.callMembership('/members', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: dto.name, email: dto.email, password: dto.password }),
    });
    if (response.status === 409) {
      throw new ConflictException('Ya existe una cuenta con ese correo');
    }
    if (!response.ok) {
      throw new ServiceUnavailableException(`Membership respondió con estado ${response.status}`);
    }
    return this.session((await response.json()) as Member);
  }

  // Membership verifica la contraseña; el Gateway nunca ve el hash
  async login(dto: LoginDto) {
    const response = await this.callMembership('/internal/auth/verify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: dto.email, password: dto.password }),
    });
    if (response.status === 401) {
      throw new UnauthorizedException('Correo o contraseña incorrectos');
    }
    if (!response.ok) {
      throw new ServiceUnavailableException(`Membership respondió con estado ${response.status}`);
    }
    return this.session((await response.json()) as Member);
  }

  private session(member: Member) {
    return {
      accessToken: signToken({ sub: member.id, email: member.email, name: member.name, role: member.role }),
      tokenType: 'Bearer',
      expiresIn: '8h',
      member: { id: member.id, name: member.name, email: member.email, role: member.role },
    };
  }

  private async callMembership(path: string, init?: RequestInit) {
    try {
      return await fetch(`${serviceBases().membership}${path}`, {
        ...init,
        signal: AbortSignal.timeout(60_000),
      });
    } catch {
      throw new ServiceUnavailableException('Membership no respondió');
    }
  }
}