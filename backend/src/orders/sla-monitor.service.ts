import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { TelegramService } from '../telegram/telegram.service';
import { OrderStatus } from '@prisma/client';

const SLA_MINUTES = 3;
const CHECK_INTERVAL_MS = 30_000; // Check every 30 seconds

@Injectable()
export class SlaMonitorService {
  private readonly logger = new Logger(SlaMonitorService.name);
  private interval: NodeJS.Timeout | null = null;
  private notifiedOrderIds = new Set<number>();

  constructor(
    private readonly prisma: PrismaService,
    private readonly telegramService: TelegramService,
  ) {
    this.startMonitoring();
  }

  private startMonitoring() {
    this.logger.log(`SLA Monitor started (${SLA_MINUTES}min threshold, checking every ${CHECK_INTERVAL_MS / 1000}s)`);
    this.interval = setInterval(() => this.checkSlaBreaches(), CHECK_INTERVAL_MS);
  }

  private async checkSlaBreaches() {
    try {
      const cutoff = new Date(Date.now() - SLA_MINUTES * 60 * 1000);

      // Find orders still PENDING that were created before the cutoff
      const overdueOrders = await this.prisma.order.findMany({
        where: {
          status: OrderStatus.PENDING,
          createdAt: { lt: cutoff },
        },
        include: {
          items: { include: { product: true } },
          user: true,
        },
        orderBy: { createdAt: 'asc' },
      });

      for (const order of overdueOrders) {
        // Only notify once per order
        if (this.notifiedOrderIds.has(order.id)) continue;

        this.notifiedOrderIds.add(order.id);
        this.logger.warn(`SLA BREACH: Order #${order.id} pending for >${SLA_MINUTES} min`);

        // Notify admin about SLA breach
        this.telegramService.notifySLABreach(order, SLA_MINUTES).catch((err) => {
          this.logger.error(`Failed to send SLA breach notification: ${err.message}`);
        });
      }

      // Clean up: remove delivered/cancelled orders from notified set
      if (this.notifiedOrderIds.size > 100) {
        const activeIds = overdueOrders.map((o) => o.id);
        this.notifiedOrderIds = new Set(activeIds);
      }
    } catch (err) {
      this.logger.error(`SLA check failed: ${err}`);
    }
  }

  onModuleDestroy() {
    if (this.interval) {
      clearInterval(this.interval);
      this.logger.log('SLA Monitor stopped');
    }
  }
}
