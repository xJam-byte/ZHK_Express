import {
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class ShopsService {
  private readonly logger = new Logger(ShopsService.name);

  constructor(private readonly prisma: PrismaService) {}

  async findAll() {
    const shops = await this.prisma.shop.findMany({
      include: {
        user: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            username: true,
            telegramId: true,
          },
        },
        _count: {
          select: {
            products: true,
            orders: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    // Enrich with revenue data
    const enriched = await Promise.all(
      shops.map(async (shop) => {
        const revenue = await this.prisma.order.aggregate({
          where: {
            shopId: shop.id,
            status: 'DELIVERED',
          },
          _sum: { totalAmount: true },
          _count: true,
        });

        return {
          ...shop,
          revenue: revenue._sum.totalAmount || 0,
          deliveredOrderCount: revenue._count,
        };
      }),
    );

    return enriched;
  }

  async suspend(id: number) {
    const shop = await this.prisma.shop.findUnique({ where: { id } });
    if (!shop) throw new NotFoundException(`Shop #${id} not found`);

    const updated = await this.prisma.shop.update({
      where: { id },
      data: { isActive: false },
    });

    this.logger.warn(`Shop #${id} "${shop.name}" SUSPENDED`);
    return updated;
  }

  async resume(id: number) {
    const shop = await this.prisma.shop.findUnique({ where: { id } });
    if (!shop) throw new NotFoundException(`Shop #${id} not found`);

    const updated = await this.prisma.shop.update({
      where: { id },
      data: { isActive: true },
    });

    this.logger.log(`Shop #${id} "${shop.name}" RESUMED`);
    return updated;
  }
}
