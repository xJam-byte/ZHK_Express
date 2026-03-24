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

  // --- PUBLIC METHODS ---

  async findAllActive() {
    return this.prisma.shop.findMany({
      where: { isActive: true },
      select: {
        id: true,
        name: true,
        address: true,
        latitude: true,
        longitude: true,
        radius: true,
      },
      orderBy: { name: 'asc' },
    });
  }

  async resolveByGeo(latitude: number, longitude: number) {
    const shops = await this.findAllActive();

    let closest: any = null;
    let minDistance = Infinity;

    for (const shop of shops) {
      if (!shop.latitude || !shop.longitude) continue;

      const distance = this.haversineDistance(
        latitude,
        longitude,
        shop.latitude,
        shop.longitude,
      );

      if (distance < minDistance) {
        minDistance = distance;
        closest = shop;
      }
    }

    if (closest && minDistance <= closest.radius) {
      this.logger.log(
        `Geo resolved: (${latitude}, ${longitude}) → "${closest.name}" (${Math.round(minDistance)}m)`,
      );
      return { shop: closest, distance: Math.round(minDistance) };
    }

    this.logger.warn(
      `Geo resolve failed: no shop within radius for (${latitude}, ${longitude}). Closest: "${closest?.name}" at ${Math.round(minDistance)}m`,
    );
    return { shop: closest, distance: Math.round(minDistance), outOfRange: true };
  }

  private haversineDistance(
    lat1: number,
    lon1: number,
    lat2: number,
    lon2: number,
  ): number {
    const R = 6371000;
    const toRad = (deg: number) => (deg * Math.PI) / 180;

    const dLat = toRad(lat2 - lat1);
    const dLon = toRad(lon2 - lon1);

    const a =
      Math.sin(dLat / 2) ** 2 +
      Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;

    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  }

  // --- ADMIN METHODS ---

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
