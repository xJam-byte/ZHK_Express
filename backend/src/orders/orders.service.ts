import {
  Injectable,
  Logger,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { TelegramService } from '../telegram/telegram.service';
import { PromocodesService } from '../promocodes/promocodes.service';
import { CreateOrderDto } from './dto/create-order.dto';
import { OrderStatus, Role, PromoType, PromoCode } from '@prisma/client';

const DELIVERY_FEE = 200; // Fixed delivery fee in tenge

@Injectable()
export class OrdersService {
  private readonly logger = new Logger(OrdersService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly telegramService: TelegramService,
    private readonly promocodesService: PromocodesService,
  ) {}

  async createOrder(userId: number, dto: CreateOrderDto) {
    const productIds = dto.items.map((item) => item.productId);
    const deliveryAddress = `Подъезд ${dto.entrance}, Этаж ${dto.floor}, Кв. ${dto.apartment}`;

    // FIX #1: All checks & mutations inside a single transaction to prevent race conditions
    const order = await this.prisma.$transaction(async (tx) => {
      // Get user's selected shop
      const user = await tx.user.findUnique({
        where: { id: userId },
        select: { selectedShopId: true },
      });

      // Re-fetch products INSIDE the transaction for consistency
      const products = await tx.product.findMany({
        where: { id: { in: productIds }, isActive: true },
      });

      if (products.length !== productIds.length) {
        const foundIds = products.map((p) => p.id);
        const missing = productIds.filter((id) => !foundIds.includes(id));
        throw new BadRequestException(
          `Products not found or inactive: ${missing.join(', ')}`,
        );
      }

      const productMap = new Map(products.map((p) => [p.id, p]));
      let subtotal = 0;

      const orderItems = dto.items.map((item) => {
        const product = productMap.get(item.productId)!;

        if (product.stock < item.quantity) {
          throw new BadRequestException(
            `Product "${product.name}" does not have enough stock (requested ${item.quantity}, available ${product.stock})`,
          );
        }

        const lineTotal = product.price * item.quantity;
        subtotal += lineTotal;

        return {
          productId: item.productId,
          quantity: item.quantity,
          priceAtPurchase: product.price,
        };
      });

      // Promo code validation inside transaction
      let discountAmount = 0;
      let finalDeliveryFee = DELIVERY_FEE;
      let validatedPromo: PromoCode | null = null;

      if (dto.promoCode) {
        const promo = await tx.promoCode.findUnique({
          where: { code: dto.promoCode.toUpperCase() },
        });

        if (!promo || !promo.isActive) {
          throw new BadRequestException('Промокод не найден или неактивен');
        }
        if (promo.expiresAt && promo.expiresAt < new Date()) {
          throw new BadRequestException('Срок действия промокода истек');
        }
        if (promo.maxUses && promo.usedCount >= promo.maxUses) {
          throw new BadRequestException('Промокод больше недоступен');
        }
        if (promo.minOrderAmount && subtotal < promo.minOrderAmount) {
          throw new BadRequestException(`Минимальная сумма заказа: ${promo.minOrderAmount} ₸`);
        }

        validatedPromo = promo;

        if (promo.type === 'PERCENT') {
          discountAmount = (subtotal * promo.value) / 100;
        } else if (promo.type === 'FIXED') {
          discountAmount = promo.value;
        } else if (promo.type === 'FREE_DELIVERY') {
          finalDeliveryFee = 0;
        }
        if (discountAmount > subtotal) {
          discountAmount = subtotal;
        }
      }

      const totalAmount = subtotal - discountAmount + finalDeliveryFee;

      const created = await tx.order.create({
        data: {
          userId,
          shopId: user?.selectedShopId,
          totalAmount,
          deliveryFee: finalDeliveryFee,
          discountAmount,
          promoCodeId: validatedPromo?.id,
          deliveryAddress,
          entrance: dto.entrance,
          floor: dto.floor,
          apartment: dto.apartment,
          comment: dto.comment,
          items: {
            create: orderItems,
          },
        },
        include: {
          items: { include: { product: true } },
          user: true,
        },
      });

      // Decrement stock
      for (const item of orderItems) {
        await tx.product.update({
          where: { id: item.productId },
          data: { stock: { decrement: item.quantity } },
        });
      }

      // Increment promo usedCount
      if (validatedPromo) {
        await tx.promoCode.update({
          where: { id: validatedPromo.id },
          data: { usedCount: { increment: 1 } },
        });
      }

      return created;
    });

    this.logger.log(`Order #${order.id} created, total: ${order.totalAmount} тг`);

    // Send Telegram notifications (fire-and-forget)
    // 1. Notify shop about new order
    this.telegramService.notifyNewOrder(order).catch((err) => {
      this.logger.error(`Failed to send shop notification: ${err.message}`);
    });
    // 2. Confirm to client
    this.telegramService.notifyOrderCreated(order).catch((err) => {
      this.logger.error(`Failed to send client confirmation: ${err.message}`);
    });

    return order;
  }

  async getOrders(userRole: Role, userId?: number, history = false) {
    const where: any = {};

    if (userRole === Role.CLIENT && userId) {
      where.userId = userId;
    }

    // For SHOP role, filter by active vs history
    if (userRole === Role.SHOP) {
      if (history) {
        where.status = {
          in: [OrderStatus.DELIVERED, OrderStatus.CANCELLED],
        };
      } else {
        where.status = {
          in: [
            OrderStatus.PENDING,
            OrderStatus.ACCEPTED,
            OrderStatus.ASSEMBLING,
            OrderStatus.READY,
            OrderStatus.DELIVERING,
          ],
        };
      }
    }

    return this.prisma.order.findMany({
      where,
      include: {
        items: { include: { product: true } },
        user: true,
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async getOrderById(id: number, requestingUserId?: number, requestingRole?: Role) {
    const order = await this.prisma.order.findUnique({
      where: { id },
      include: {
        items: { include: { product: true } },
        user: true,
      },
    });

    if (!order) {
      throw new NotFoundException(`Order #${id} not found`);
    }

    // FIX #5: Only owner, shop, or admin can view the order
    if (
      requestingRole === Role.CLIENT &&
      requestingUserId !== undefined &&
      order.userId !== requestingUserId
    ) {
      throw new NotFoundException(`Order #${id} not found`);
    }

    return order;
  }

  async updateStatus(id: number, newStatus: OrderStatus) {
    const order = await this.prisma.order.findUnique({ where: { id } });

    if (!order) {
      throw new NotFoundException(`Order #${id} not found`);
    }

    // Validate status transitions
    const validTransitions: Record<OrderStatus, OrderStatus[]> = {
      [OrderStatus.PENDING]: [OrderStatus.ACCEPTED, OrderStatus.CANCELLED],
      [OrderStatus.ACCEPTED]: [OrderStatus.ASSEMBLING, OrderStatus.CANCELLED],
      [OrderStatus.ASSEMBLING]: [OrderStatus.READY, OrderStatus.CANCELLED],
      [OrderStatus.READY]: [OrderStatus.DELIVERING],
      [OrderStatus.DELIVERING]: [OrderStatus.DELIVERED],
      [OrderStatus.DELIVERED]: [],
      [OrderStatus.CANCELLED]: [],
    };

    if (!validTransitions[order.status]?.includes(newStatus)) {
      throw new BadRequestException(
        `Cannot transition from ${order.status} to ${newStatus}`,
      );
    }

    const updateData: any = { status: newStatus };

    // Track timestamps for SLA
    if (newStatus === OrderStatus.ACCEPTED) {
      updateData.acceptedAt = new Date();
    }
    if (newStatus === OrderStatus.DELIVERED) {
      updateData.deliveredAt = new Date();
    }

    const updated = await this.prisma.order.update({
      where: { id },
      data: updateData,
      include: {
        items: { include: { product: true } },
        user: true,
      },
    });

    this.logger.log(`Order #${id} status changed: ${order.status} → ${newStatus}`);

    // Send notifications (fire-and-forget)
    // 1. Notify client about status change
    this.telegramService.notifyStatusChange(updated, newStatus).catch((err) => {
      this.logger.error(`Failed to send client notification: ${err.message}`);
    });
    // 2. Notify shop about delivery completion
    this.telegramService.notifyShopStatusChange(updated, newStatus).catch((err) => {
      this.logger.error(`Failed to send shop notification: ${err.message}`);
    });

    return updated;
  }

  async rateOrder(id: number, userId: number, rating: number, review?: string) {
    // FIX #4: Validate rating type
    const numRating = Number(rating);
    if (!Number.isInteger(numRating) || numRating < 1 || numRating > 5) {
      throw new BadRequestException('Rating must be an integer between 1 and 5');
    }

    const order = await this.prisma.order.findUnique({ where: { id } });

    if (!order) {
      throw new NotFoundException(`Order #${id} not found`);
    }

    if (order.userId !== userId) {
      throw new BadRequestException('You can only rate your own orders');
    }

    if (order.status !== OrderStatus.DELIVERED) {
      throw new BadRequestException('You can only rate delivered orders');
    }

    // FIX #3: Prevent re-rating
    if (order.rating !== null) {
      throw new BadRequestException('Order has already been rated');
    }

    const updated = await this.prisma.order.update({
      where: { id },
      data: { rating, review },
    });

    this.logger.log(`Order #${id} rated: ${rating} stars`);

    return updated;
  }

  async getShopReviews(shopId: number) {
    return this.prisma.order.findMany({
      where: {
        shopId,
        rating: { not: null },
        status: 'DELIVERED',
      },
      select: {
        id: true,
        rating: true,
        review: true,
        createdAt: true,
        deliveredAt: true,
        user: {
          select: {
            firstName: true,
            lastName: true,
          },
        },
      },
      orderBy: { deliveredAt: 'desc' },
    });
  }

  async getShopRatingStats(shopId: number) {
    const agg = await this.prisma.order.aggregate({
      where: {
        shopId,
        rating: { not: null },
        status: 'DELIVERED',
      },
      _avg: { rating: true },
      _count: { rating: true },
    });

    // Star breakdown
    const breakdown: Record<number, number> = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
    const groups = await this.prisma.order.groupBy({
      by: ['rating'],
      where: {
        shopId,
        rating: { not: null },
        status: 'DELIVERED',
      },
      _count: { rating: true },
    });

    for (const g of groups) {
      if (g.rating !== null) {
        breakdown[g.rating] = g._count.rating;
      }
    }

    return {
      averageRating: agg._avg.rating ? Math.round(agg._avg.rating * 10) / 10 : null,
      totalReviews: agg._count.rating,
      breakdown,
    };
  }
}
