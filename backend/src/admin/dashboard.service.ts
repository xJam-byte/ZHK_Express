import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { TelegramService } from '../telegram/telegram.service';

@Injectable()
export class DashboardService {
  private readonly logger = new Logger(DashboardService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly telegramService: TelegramService,
  ) {}

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

  async generateAndSendReport(adminTelegramId: string | number) {
    const orders = await this.exportOrders();
    const dashboard = await this.getDashboard();

    // Build CSV content
    const headers = [
      'ID', 'Дата', 'Статус', 'Магазин',
      'Клиент', 'Адрес',
      'Товары', 'Кол-во',
      'Сумма товаров', 'Доставка', 'Скидка', 'Итого',
      'Промокод', 'Оценка', 'Отзыв',
    ];

    const esc = (v: any) => `"${String(v ?? '').replace(/"/g, '""')}"`;

    const rows = orders.map((o: any) => {
      const itemsList = (o.items || [])
        .map((i: any) => `${i.product?.name || '?'} x${i.quantity}`)
        .join('; ');
      const itemsCount = (o.items || []).reduce((s: number, i: any) => s + i.quantity, 0);
      const subtotal = (o.items || []).reduce(
        (s: number, i: any) => s + (i.priceAtPurchase * i.quantity), 0,
      );

      return [
        o.id,
        new Date(o.createdAt).toLocaleString('ru-RU'),
        o.status,
        o.shop?.name || '',
        `${o.user?.firstName || ''} ${o.user?.lastName || ''}`.trim() || '',
        o.deliveryAddress || '',
        itemsList,
        itemsCount,
        subtotal,
        o.deliveryFee || 0,
        o.discountAmount || 0,
        o.totalAmount || 0,
        o.promoCode?.code || '',
        o.rating || '',
        o.review || '',
      ].map(esc).join(',');
    });

    // Summary section at the bottom
    const summary = [
      '',
      '',
      ['СВОДКА'].map(esc).join(','),
      ['Общий доход', `${dashboard.totalRevenue} ₸`].map(esc).join(','),
      ['Доставка (наш доход)', `${dashboard.platformFee} ₸`].map(esc).join(','),
      ['Средний чек', `${dashboard.averageOrderAmount} ₸`].map(esc).join(','),
      ['Всего заказов', dashboard.totalOrders].map(esc).join(','),
      ['Доставлено', dashboard.deliveredOrders].map(esc).join(','),
      ['Отменено', dashboard.cancelledOrders].map(esc).join(','),
      ['Клиентов', dashboard.totalClients].map(esc).join(','),
      '',
      ['ДОХОД ПО МАГАЗИНАМ'].map(esc).join(','),
      ['Магазин', 'Доход', 'Заказов', 'Товаров'].map(esc).join(','),
      ...dashboard.shops.map((shop: any) =>
        [shop.name, `${shop.revenue} ₸`, shop.deliveredOrderCount, shop.totalProducts].map(esc).join(',')
      ),
    ];

    const csvContent = '\uFEFF' + [
      headers.join(','),
      ...rows,
      ...summary,
    ].join('\n');

    const buffer = Buffer.from(csvContent, 'utf-8');
    const date = new Date().toISOString().split('T')[0];
    const filename = `JK_Express_Аналитика_${date}.csv`;

    const caption =
      `📊 Финансовая аналитика JK-Express\n\n` +
      `💰 Общий доход: ${dashboard.totalRevenue.toLocaleString()} ₸\n` +
      `🚚 Наш доход: ${dashboard.platformFee.toLocaleString()} ₸\n` +
      `📦 Заказов: ${dashboard.totalOrders}\n` +
      `✅ Доставлено: ${dashboard.deliveredOrders}`;

    await this.telegramService.sendDocumentToUser(
      adminTelegramId,
      buffer,
      filename,
      caption,
    );

    this.logger.log(`Report sent to admin TG:${adminTelegramId}`);
    return { success: true, filename, ordersCount: orders.length };
  }
}
