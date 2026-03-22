import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class DashboardService {
  private readonly logger = new Logger(DashboardService.name);

  constructor(private readonly prisma: PrismaService) {}

  async getDashboard() {
    // Total orders stats
    const [
      totalOrders,
      deliveredOrders,
      cancelledOrders,
      pendingOrders,
      activeOrders,
    ] = await Promise.all([
      this.prisma.order.count(),
      this.prisma.order.count({ where: { status: 'DELIVERED' } }),
      this.prisma.order.count({ where: { status: 'CANCELLED' } }),
      this.prisma.order.count({ where: { status: 'PENDING' } }),
      this.prisma.order.count({
        where: {
          status: {
            in: ['PENDING', 'ACCEPTED', 'ASSEMBLING', 'READY', 'DELIVERING'],
          },
        },
      }),
    ]);

    // Revenue
    const revenueAgg = await this.prisma.order.aggregate({
      where: { status: 'DELIVERED' },
      _sum: { totalAmount: true, deliveryFee: true },
    });

    const totalRevenue = revenueAgg._sum.totalAmount || 0;
    const totalDeliveryFees = revenueAgg._sum.deliveryFee || 0;
    const averageOrderAmount =
      deliveredOrders > 0 ? Math.round(totalRevenue / deliveredOrders) : 0;

    // Per-shop stats
    const shops = await this.prisma.shop.findMany({
      include: {
        user: {
          select: { firstName: true, lastName: true, username: true },
        },
        _count: {
          select: { products: true, orders: true },
        },
      },
    });

    const shopStats = await Promise.all(
      shops.map(async (shop) => {
        const shopRevenue = await this.prisma.order.aggregate({
          where: { shopId: shop.id, status: 'DELIVERED' },
          _sum: { totalAmount: true },
          _count: true,
        });

        const shopActiveOrders = await this.prisma.order.count({
          where: {
            shopId: shop.id,
            status: {
              in: ['PENDING', 'ACCEPTED', 'ASSEMBLING', 'READY', 'DELIVERING'],
            },
          },
        });

        return {
          id: shop.id,
          name: shop.name,
          isActive: shop.isActive,
          revenue: shopRevenue._sum.totalAmount || 0,
          deliveredOrderCount: shopRevenue._count,
          activeOrderCount: shopActiveOrders,
          totalProducts: shop._count.products,
          totalOrders: shop._count.orders,
          owner: shop.user,
        };
      }),
    );

    // Total users
    const totalClients = await this.prisma.user.count({
      where: { role: 'CLIENT' },
    });

    const activeShops = shops.filter((s) => s.isActive).length;
    const suspendedShops = shops.filter((s) => !s.isActive).length;

    return {
      totalRevenue,
      totalDeliveryFees,
      platformFee: totalDeliveryFees, // delivery fees = platform revenue
      totalOrders,
      deliveredOrders,
      cancelledOrders,
      pendingOrders,
      activeOrders,
      averageOrderAmount,
      totalClients,
      activeShops,
      suspendedShops,
      shops: shopStats,
    };
  }
}
