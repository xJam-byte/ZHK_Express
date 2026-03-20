import { createHmac } from 'crypto';
import {
  Injectable,
  CanActivate,
  ExecutionContext,
  UnauthorizedException,
  SetMetadata,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { PrismaService } from '../prisma/prisma.service';
import { Role } from '@prisma/client';

export const ROLES_KEY = 'roles';
export const Roles = (...roles: Role[]) => SetMetadata(ROLES_KEY, roles);

export interface TelegramUser {
  id: number;
  first_name?: string;
  last_name?: string;
  username?: string;
}

@Injectable()
export class TelegramAuthGuard implements CanActivate {
  constructor(
    private readonly prisma: PrismaService,
    private readonly reflector: Reflector,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const initData = request.headers['x-telegram-init-data'] as string;

    if (!initData) {
      throw new UnauthorizedException('Telegram initData is required');
    }

    const telegramUser = this.validateInitData(initData);
    if (!telegramUser) {
      throw new UnauthorizedException('Invalid Telegram initData');
    }

    // Upsert user in database
    const user = await this.prisma.user.upsert({
      where: { telegramId: BigInt(telegramUser.id) },
      update: {
        firstName: telegramUser.first_name,
        lastName: telegramUser.last_name,
        username: telegramUser.username,
      },
      create: {
        telegramId: BigInt(telegramUser.id),
        firstName: telegramUser.first_name,
        lastName: telegramUser.last_name,
        username: telegramUser.username,
        role: Role.CLIENT,
      },
    });

    request.user = user;

    // Check role-based access
    const requiredRoles = this.reflector.getAllAndOverride<Role[]>(ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (requiredRoles && requiredRoles.length > 0) {
      if (!requiredRoles.includes(user.role)) {
        throw new UnauthorizedException('Insufficient permissions');
      }
    }

    return true;
  }

  private validateInitData(initData: string): TelegramUser | null {
    try {
      const botToken = process.env.TELEGRAM_BOT_TOKEN;
      if (!botToken) {
        // In development, parse without validation
        const params = new URLSearchParams(initData);
        const userStr = params.get('user');
        if (userStr) {
          return JSON.parse(decodeURIComponent(userStr));
        }
        return null;
      }

      const params = new URLSearchParams(initData);
      const hash = params.get('hash');
      params.delete('hash');

      // Sort params alphabetically
      const dataCheckString = Array.from(params.entries())
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([key, value]) => `${key}=${value}`)
        .join('\n');

      // HMAC-SHA256 validation
      const secretKey = createHmac('sha256', 'WebAppData').update(botToken).digest();
      const computedHash = createHmac('sha256', secretKey)
        .update(dataCheckString)
        .digest('hex');

      if (computedHash !== hash) {
        return null;
      }

      const userStr = params.get('user');
      if (!userStr) return null;

      return JSON.parse(decodeURIComponent(userStr));
    } catch {
      return null;
    }
  }
}
