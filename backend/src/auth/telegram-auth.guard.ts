import { createHmac } from 'crypto';
import {
  Injectable,
  CanActivate,
  ExecutionContext,
  UnauthorizedException,
  SetMetadata,
  Logger,
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
  private readonly logger = new Logger('TelegramAuth');

  constructor(
    private readonly prisma: PrismaService,
    private readonly reflector: Reflector,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const initData = request.headers['x-telegram-init-data'] as string;

    if (!initData) {
      this.logger.warn('No initData header received');
      throw new UnauthorizedException('Telegram initData is required');
    }

    this.logger.debug(`initData received (length: ${initData.length})`);

    const telegramUser = this.validateInitData(initData);
    if (!telegramUser) {
      this.logger.warn('initData validation FAILED');
      throw new UnauthorizedException('Invalid Telegram initData');
    }

    this.logger.log(
      `Auth OK: telegram_id=${telegramUser.id}, name=${telegramUser.first_name}`,
    );

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

    this.logger.log(
      `User loaded: id=${user.id}, telegram_id=${user.telegramId}, role=${user.role}`,
    );

    request.user = user;

    // Check role-based access
    const requiredRoles = this.reflector.getAllAndOverride<Role[]>(ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (requiredRoles && requiredRoles.length > 0) {
      if (!requiredRoles.includes(user.role)) {
        this.logger.warn(
          `Access denied: user role=${user.role}, required=${requiredRoles.join(',')}`,
        );
        throw new UnauthorizedException('Insufficient permissions');
      }
    }

    return true;
  }

  private validateInitData(initData: string): TelegramUser | null {
    try {
      const botToken = process.env.TELEGRAM_BOT_TOKEN;

      this.logger.debug(
        `Bot token present: ${!!botToken}, length: ${botToken?.length || 0}`,
      );

      if (!botToken) {
        // In development, parse without validation
        this.logger.warn('No bot token — skipping HMAC validation (dev mode)');
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

      // Extract user info first for logging
      const userStr = params.get('user');
      if (userStr) {
        const parsedUser = JSON.parse(decodeURIComponent(userStr));
        this.logger.debug(`initData user: id=${parsedUser.id}, name=${parsedUser.first_name}`);
      }

      // Sort params alphabetically
      const sortedEntries: [string, string][] = [];
      params.forEach((value, key) => {
        sortedEntries.push([key, value]);
      });
      sortedEntries.sort(([a], [b]) => a.localeCompare(b));

      const dataCheckString = sortedEntries
        .map(([key, value]) => `${key}=${value}`)
        .join('\n');

      // HMAC-SHA256 validation
      const secretKey = createHmac('sha256', 'WebAppData')
        .update(botToken)
        .digest();
      const computedHash = createHmac('sha256', secretKey)
        .update(dataCheckString)
        .digest('hex');

      this.logger.debug(`Hash comparison: received=${hash?.substring(0, 16)}..., computed=${computedHash.substring(0, 16)}...`);

      if (computedHash !== hash) {
        this.logger.warn('HMAC hash mismatch — initData is invalid or token is wrong');
        return null;
      }

      if (!userStr) return null;
      return JSON.parse(decodeURIComponent(userStr));
    } catch (err) {
      this.logger.error(`Validation error: ${err}`);
      return null;
    }
  }
}
