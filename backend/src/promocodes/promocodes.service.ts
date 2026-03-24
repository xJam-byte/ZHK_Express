import { Injectable, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { PromoType } from '@prisma/client';

@Injectable()
export class PromocodesService {
  constructor(private prisma: PrismaService) {}

  async findAll() {
    return this.prisma.promoCode.findMany({
      orderBy: { createdAt: 'desc' }
    });
  }

  async create(data: {
    code: string;
    type: PromoType;
    value: number;
    minOrderAmount?: number;
    maxUses?: number;
    expiresAt?: Date;
  }) {
    // Ensure code is upper case
    data.code = data.code.toUpperCase();

    // FIX #6: Validate percent range
    if (data.type === 'PERCENT' && (data.value < 1 || data.value > 100)) {
      throw new BadRequestException('Percent promo value must be between 1 and 100');
    }
    if (data.value <= 0) {
      throw new BadRequestException('Promo value must be positive');
    }
    
    // Check if code exists
    const existing = await this.prisma.promoCode.findUnique({
      where: { code: data.code }
    });
    if (existing) {
      throw new BadRequestException('Promo code already exists');
    }

    return this.prisma.promoCode.create({ data });
  }

  async toggleActive(id: number) {
    const promo = await this.prisma.promoCode.findUnique({ where: { id } });
    if (!promo) throw new BadRequestException('Promo code not found');
    
    return this.prisma.promoCode.update({
      where: { id },
      data: { isActive: !promo.isActive }
    });
  }

  async validate(code: string, orderAmount: number) {
    const promo = await this.prisma.promoCode.findUnique({
      where: { code: code.toUpperCase() }
    });

    if (!promo) {
      throw new BadRequestException('Промокод не найден');
    }

    if (!promo.isActive) {
      throw new BadRequestException('Промокод неактивен');
    }

    if (promo.expiresAt && promo.expiresAt < new Date()) {
      throw new BadRequestException('Срок действия промокода истек');
    }

    if (promo.maxUses && promo.usedCount >= promo.maxUses) {
      throw new BadRequestException('Промокод больше недоступен');
    }

    if (promo.minOrderAmount && orderAmount < promo.minOrderAmount) {
      throw new BadRequestException(`Минимальная сумма заказа для промокода: ${promo.minOrderAmount} ₸`);
    }

    return promo;
  }
}
