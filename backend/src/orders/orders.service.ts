import {
  Injectable,
  Logger,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { TelegramService } from '../telegram/telegram.service';
import { CreateOrderDto } from './dto/create-order.dto';
import { OrderStatus, Role } from '@prisma/client';

const DELIVERY_FEE = 200; // Fixed delivery fee in tenge

@Injectable()
export class OrdersService {
  private readonly logger = new Logger(OrdersService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly telegramService: TelegramService,
  ) {}

  async createOrder(userId: number, dto: CreateOrderDto) {
    // Fetch current product prices for secure server-side calculation
    const productIds = dto.items.map((item) => item.productId);
    const products = await this.prisma.product.findMany({
      where: { id: { in: productIds }, isActive: true },
    });

    if (products.length !== productIds.length) {
      const foundIds = products.map((p) => p.id);
      const missing = productIds.filter((id) => !foundIds.includes(id));
      throw new BadRequestException(
        `Products not found or inactive: ${missing.join(', ')}`,
      );
    }

    // Build order items with server-side prices
    const productMap = new Map(products.map((p) => [p.id, p]));
    let subtotal = 0;

    const orderItems = dto.items.map((item) => {
      const product = productMap.get(item.productId)!;
      const lineTotal = product.price * item.quantity;
      subtotal += lineTotal;

      return {
        productId: item.productId,
        quantity: item.quantity,
        priceAtPurchase: product.price,
      };
    });

    const totalAmount = subtotal + DELIVERY_FEE;
    const deliveryAddress = `Подъезд ${dto.entrance}, Этаж ${dto.floor}, Кв. ${dto.apartment}`;

    // Create order with items in a transaction
    const order = await this.prisma.$transaction(async (tx) => {
      const created = await tx.order.create({
        data: {
          userId,
          totalAmount,
          deliveryFee: DELIVERY_FEE,
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

      return created;
    });

    this.logger.log(`Order #${order.id} created, total: ${totalAmount} тг`);

    // Send Telegram notification (fire-and-forget)
    this.telegramService.notifyNewOrder(order).catch((err) => {
      this.logger.error(`Failed to send Telegram notification: ${err.message}`);
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

  async getOrderById(id: number) {
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

    // Track when order was accepted (for SLA)
    if (newStatus === OrderStatus.ACCEPTED) {
      updateData.acceptedAt = new Date();
    }

    return this.prisma.order.update({
      where: { id },
      data: updateData,
      include: {
        items: { include: { product: true } },
        user: true,
      },
    });
  }
}
