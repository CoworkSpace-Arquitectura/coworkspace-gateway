import { ConflictException, Injectable, ServiceUnavailableException, UnauthorizedException } from '@nestjs/common';
import { signToken } from '../gateway/jwt.js';
import { serviceBases } from '../gateway/routes.js';
import { LoginDto, RegisterDto } from './dto/auth.dto.js';

export interface Member {
  id: string;
  name: string;
  email: string;
}

@Injectable()
export class AuthService {
  async register(dto: RegisterDto) {
    const response = await this.callMembership('/members', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: dto.name, email: dto.email }),
    });
    if (response.status === 409) {
      throw new ConflictException('Ya existe un miembro con ese correo');
    }
    if (!response.ok) {
      throw new ServiceUnavailableException(`Membership respondió con estado ${response.status}`);
    }
    return this.session((await response.json()) as Member);
  }

  async login(dto: LoginDto) {
    const response = await this.callMembership(`/members?email=${encodeURIComponent(dto.email)}`);
    if (!response.ok) {
      throw new ServiceUnavailableException(`Membership respondió con estado ${response.status}`);
    }
    const members = (await response.json()) as Member[];
    const member = members.find((m) => m.email === dto.email);
    if (!member) {
      throw new UnauthorizedException('No existe un miembro con ese correo');
    }
    return this.session(member);
  }

  private session(member: Member) {
    return {
      accessToken: signToken({ sub: member.id, email: member.email, name: member.name }),
      tokenType: 'Bearer',
      expiresIn: '8h',
      member,
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