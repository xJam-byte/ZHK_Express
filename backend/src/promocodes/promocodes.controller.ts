import { Controller, Get, Post, Body, Patch, Param, UseGuards, BadRequestException } from '@nestjs/common';
import { PromocodesService } from './promocodes.service';
import { TelegramAuthGuard, Roles } from '../auth/telegram-auth.guard';
import { PromoType, Role } from '@prisma/client';

@Controller('api/promo')
export class PromocodesController {
  constructor(private readonly promocodesService: PromocodesService) {}

  @Get()
  @UseGuards(TelegramAuthGuard)
  @Roles(Role.ADMIN)
  findAll() {
    return this.promocodesService.findAll();
  }

  @Post()
  @UseGuards(TelegramAuthGuard)
  @Roles(Role.ADMIN)
  create(@Body() body: {
    code: string;
    type: PromoType;
    value: number;
    minOrderAmount?: number;
    maxUses?: number;
    expiresAt?: string;
  }) {
    return this.promocodesService.create({
      ...body,
      expiresAt: body.expiresAt ? new Date(body.expiresAt) : undefined,
    });
  }

  @Patch(':id/toggle')
  @UseGuards(TelegramAuthGuard)
  @Roles(Role.ADMIN)
  toggleActive(@Param('id') id: string) {
    return this.promocodesService.toggleActive(+id);
  }

  @Post('validate')
  @UseGuards(TelegramAuthGuard)
  validate(@Body() body: { code: string; orderAmount: number }) {
    if (!body.code || typeof body.orderAmount !== 'number') {
      throw new BadRequestException('Неверные параметры');
    }
    return this.promocodesService.validate(body.code, body.orderAmount);
  }
}
