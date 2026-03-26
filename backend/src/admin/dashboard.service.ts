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

    // FIX #8: Replace N+1 per-shop queries with single groupBy
    const shopRevenueAgg = await this.prisma.order.groupBy({
      by: ['shopId'],
      where: { status: 'DELIVERED' },
      _sum: { totalAmount: true },
      _count: true,
    });

    const shopActiveAgg = await this.prisma.order.groupBy({
      by: ['shopId'],
      where: {
        status: { in: ['PENDING', 'ACCEPTED', 'ASSEMBLING', 'READY', 'DELIVERING'] },
      },
      _count: true,
    });

    const revenueByShop = new Map(shopRevenueAgg.map(s => [s.shopId, s]));
    const activeByShop = new Map(shopActiveAgg.map(s => [s.shopId, s]));

    const shopStats = shops.map((shop) => {
      const rev = revenueByShop.get(shop.id);
      const act = activeByShop.get(shop.id);
      return {
        id: shop.id,
        name: shop.name,
        isActive: shop.isActive,
        revenue: rev?._sum.totalAmount || 0,
        deliveredOrderCount: rev?._count || 0,
        activeOrderCount: act?._count || 0,
        totalProducts: shop._count.products,
        totalOrders: shop._count.orders,
        owner: shop.user,
      };
    });

    // Total users
    const totalClients = await this.prisma.user.count({
      where: { role: 'CLIENT' },
    });

    const activeShops = shops.filter((s) => s.isActive).length;
    const suspendedShops = shops.filter((s) => !s.isActive).length;

    // Advanced Analytics Phase 4:
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    // 1. Sales Trend
    const recentOrders = await this.prisma.order.findMany({
      where: { status: 'DELIVERED', createdAt: { gte: thirtyDaysAgo } },
      select: { totalAmount: true, createdAt: true, acceptedAt: true, deliveredAt: true },
    });

    const salesTrendMap = new Map<string, number>();
    const slaCounters = { under15: 0, under30: 0, over30: 0 };

    recentOrders.forEach(o => {
      // Aggregate Sales Trend by Date (YYYY-MM-DD)
      const dateStr = o.createdAt.toISOString().split('T')[0];
      salesTrendMap.set(dateStr, (salesTrendMap.get(dateStr) || 0) + o.totalAmount);

      // SLA Stats (from accepted to delivered)
      if (o.acceptedAt && o.deliveredAt) {
        const diffMinutes = (o.deliveredAt.getTime() - o.acceptedAt.getTime()) / 60000;
        if (diffMinutes <= 15) slaCounters.under15++;
        else if (diffMinutes <= 30) slaCounters.under30++;
        else slaCounters.over30++;
      }
    });

    const salesTrend = Array.from(salesTrendMap.entries())
      .map(([date, amount]) => ({ date, amount }))
      .sort((a, b) => a.date.localeCompare(b.date));

    // 2. Top Products
    const orderItemsAgg = await this.prisma.orderItem.groupBy({
      by: ['productId'],
      _sum: { quantity: true },
      orderBy: { _sum: { quantity: 'desc' } },
      take: 5,
    });

    const topProductIds = orderItemsAgg.map(item => item.productId);
    const topProductsMeta = await this.prisma.product.findMany({
      where: { id: { in: topProductIds } },
      select: { id: true, name: true }
    });

    const topProducts = orderItemsAgg.map(item => ({
      name: topProductsMeta.find(p => p.id === item.productId)?.name || 'Unknown',
      quantity: item._sum.quantity || 0,
    }));

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
      salesTrend,
      topProducts,
      slaStats: [
        { name: '< 15 мин', value: slaCounters.under15 },
        { name: '15-30 мин', value: slaCounters.under30 },
        { name: '> 30 мин', value: slaCounters.over30 },
      ]
    };
  }

  async exportOrders() {
    // FIX #7: Limit export to prevent OOM on large datasets
    return this.prisma.order.findMany({
      take: 10000,
      include: {
        user: { select: { firstName: true, lastName: true, username: true } },
        shop: { select: { id: true, name: true } },
        items: { include: { product: { select: { name: true, price: true } } } },
        promoCode: { select: { code: true } },
      },
      orderBy: { createdAt: 'desc' }
    });
  }
}
