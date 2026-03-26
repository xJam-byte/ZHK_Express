import { Injectable, Logger } from '@nestjs/common';
import { Telegraf, Markup } from 'telegraf';

const STATUS_MESSAGES: Record<string, { emoji: string; text: string }> = {
  ACCEPTED: { emoji: '✅', text: 'Ваш заказ принят магазином! Начинаем сборку.' },
  ASSEMBLING: { emoji: '📦', text: 'Ваш заказ собирается.' },
  READY: { emoji: '🎉', text: 'Ваш заказ собран и готов к доставке!' },
  DELIVERING: { emoji: '🚗', text: 'Курьер уже в пути. Ожидайте!' },
  DELIVERED: { emoji: '🏠', text: 'Заказ доставлен! Спасибо за покупку ❤️' },
  CANCELLED: { emoji: '❌', text: 'К сожалению, заказ был отменён.' },
};

@Injectable()
export class TelegramService {
  private readonly logger = new Logger(TelegramService.name);
  private bot: Telegraf | null = null;

  constructor() {
    const token = process.env.TELEGRAM_BOT_TOKEN;
    if (token) {
      this.bot = new Telegraf(token);
      this.setupCommands();
      this.bot.launch().catch((err) => {
        this.logger.error(`Failed to launch bot: ${err.message}`);
      });
      this.logger.log('Telegram bot launched');
    } else {
      this.logger.warn('TELEGRAM_BOT_TOKEN not set — bot is disabled');
    }
  }

  private setupCommands() {
    if (!this.bot) return;

    this.bot.command('start', (ctx) => {
      const webAppUrl = process.env.WEBAPP_URL || 'https://your-domain.com';
      ctx.reply(
        '🏠 Добро пожаловать в ЖК-EXPRESS!\n\nЗакажите доставку продуктов прямо к двери.',
        Markup.inlineKeyboard([
          Markup.button.webApp('🛒 Открыть магазин', webAppUrl),
        ]),
      );
    });
  }

  // ─── Notification: New Order → Shop ─────────────────────
  async notifyNewOrder(order: any) {
    const chatId = process.env.TELEGRAM_SHOP_CHAT_ID;
    if (!this.bot || !chatId) {
      this.logger.warn('Cannot send shop notification — bot or chat ID not configured');
      return;
    }

    const itemsList = order.items
      .map(
        (item: any) =>
          `  • ${item.product.name} × ${item.quantity} = ${item.priceAtPurchase * item.quantity} тг`,
      )
      .join('\n');

    const userName = [order.user.firstName, order.user.lastName]
      .filter(Boolean)
      .join(' ') || `ID: ${order.user.telegramId}`;

    const message =
      `🆕 *Новый заказ #${order.id}*\n\n` +
      `👤 Клиент: ${userName}\n` +
      `📍 ${order.deliveryAddress}\n` +
      `${order.comment ? `💬 ${order.comment}\n` : ''}` +
      `\n📦 Товары:\n${itemsList}\n\n` +
      `💰 Итого: *${order.totalAmount} тг* (доставка: ${order.deliveryFee} тг)`;

    const webAppUrl = process.env.WEBAPP_URL || 'https://your-domain.com';

    try {
      await this.bot.telegram.sendMessage(chatId, message, {
        parse_mode: 'Markdown',
        ...Markup.inlineKeyboard([
          Markup.button.webApp('📋 Открыть заказы', `${webAppUrl}/shop`),
        ]),
      });
      this.logger.log(`Shop notification sent for order #${order.id}`);
    } catch (error) {
      const errMsg = error instanceof Error ? error.message : String(error);
      this.logger.error(`Failed to send shop notification: ${errMsg}`);
    }
  }

  // ─── Notification: New Order confirmation → Client ──────
  async notifyOrderCreated(order: any) {
    const customerChatId = order.user?.telegramId?.toString();
    if (!this.bot || !customerChatId) return;

    const itemCount = order.items?.length || 0;
    const message =
      `✅ *Заказ #${order.id} оформлен!*\n\n` +
      `📦 ${itemCount} товаров на сумму *${order.totalAmount} тг*\n` +
      `📍 ${order.deliveryAddress}\n\n` +
      `⏳ Ожидайте подтверждения от магазина.`;

    const webAppUrl = process.env.WEBAPP_URL || 'https://your-domain.com';

    try {
      await this.bot.telegram.sendMessage(customerChatId, message, {
        parse_mode: 'Markdown',
        ...Markup.inlineKeyboard([
          Markup.button.webApp('📦 Отследить заказ', `${webAppUrl}/orders/${order.id}`),
        ]),
      });
      this.logger.log(`Client confirmation sent for order #${order.id} to ${customerChatId}`);
    } catch (error) {
      const errMsg = error instanceof Error ? error.message : String(error);
      this.logger.error(`Failed to send client confirmation: ${errMsg}`);
    }
  }

  // ─── Notification: Status Changed → Client ──────────────
  async notifyStatusChange(order: any, newStatus: string) {
    const customerChatId = order.user?.telegramId?.toString();
    if (!this.bot || !customerChatId) return;

    const statusInfo = STATUS_MESSAGES[newStatus];
    if (!statusInfo) return;

    const message =
      `${statusInfo.emoji} *Заказ #${order.id}*\n\n` +
      `${statusInfo.text}\n\n` +
      `💰 Сумма: ${order.totalAmount} тг\n` +
      `📍 ${order.deliveryAddress}`;

    const webAppUrl = process.env.WEBAPP_URL || 'https://your-domain.com';

    try {
      await this.bot.telegram.sendMessage(customerChatId, message, {
        parse_mode: 'Markdown',
        ...Markup.inlineKeyboard([
          Markup.button.webApp('📦 Подробнее', `${webAppUrl}/orders/${order.id}`),
        ]),
      });
      this.logger.log(`Status notification (${newStatus}) sent for order #${order.id} to ${customerChatId}`);
    } catch (error) {
      const errMsg = error instanceof Error ? error.message : String(error);
      this.logger.error(`Failed to send status notification: ${errMsg}`);
    }
  }

  // ─── Notification: Status Changed → Shop ────────────────
  async notifyShopStatusChange(order: any, newStatus: string) {
    const chatId = process.env.TELEGRAM_SHOP_CHAT_ID;
    if (!this.bot || !chatId) return;

    // Only notify shop about deliveries and cancellations by others
    if (newStatus === 'DELIVERED') {
      const message =
        `✅ *Заказ #${order.id} доставлен!*\n\n` +
        `👤 ${order.user?.firstName || 'Клиент'}\n` +
        `💰 ${order.totalAmount} тг`;

      try {
        await this.bot.telegram.sendMessage(chatId, message, {
          parse_mode: 'Markdown',
        });
      } catch (error) {
        const errMsg = error instanceof Error ? error.message : String(error);
        this.logger.error(`Failed to send shop status notification: ${errMsg}`);
      }
    }
  }

  // ─── Notification: SLA Breach → Admin ────────────────────
  async notifySLABreach(order: any, slaMinutes: number) {
    const adminChatId = process.env.TELEGRAM_ADMIN_CHAT_ID;
    if (!this.bot || !adminChatId) {
      this.logger.warn('Cannot send SLA breach alert — bot or admin chat ID not configured');
      return;
    }

    const elapsed = Math.round(
      (Date.now() - new Date(order.createdAt).getTime()) / 60000,
    );

    const customerName = [order.user?.firstName, order.user?.lastName]
      .filter(Boolean)
      .join(' ') || `TG ID: ${order.user?.telegramId}`;

    const itemsList = order.items
      ?.map((item: any) => `  • ${item.product?.name} × ${item.quantity}`)
      .join('\n') || '  (нет данных)';

    const message =
      `🚨 *SLA НАРУШЕНИЕ — Заказ #${order.id}*\n\n` +
      `⏱ Заказ ожидает *${elapsed} мин* (лимит: ${slaMinutes} мин)\n\n` +
      `👤 Клиент: ${customerName}\n` +
      `📍 ${order.deliveryAddress}\n` +
      `💰 Сумма: ${order.totalAmount} тг\n\n` +
      `📦 Товары:\n${itemsList}\n\n` +
      `⚠️ Магазин не принял заказ вовремя!`;

    const webAppUrl = process.env.WEBAPP_URL || 'https://your-domain.com';

    try {
      await this.bot.telegram.sendMessage(adminChatId, message, {
        parse_mode: 'Markdown',
        ...Markup.inlineKeyboard([
          Markup.button.webApp('📋 Открыть заказы', `${webAppUrl}/shop`),
        ]),
      });
      this.logger.log(`SLA breach alert sent for order #${order.id} (${elapsed}min)`);
    } catch (error) {
      const errMsg = error instanceof Error ? error.message : String(error);
      this.logger.error(`Failed to send SLA breach alert: ${errMsg}`);
    }
  }

  // ─── Send document to user ────────────────────────────────
  async sendDocumentToUser(
    chatId: string | number,
    fileBuffer: Buffer,
    filename: string,
    caption?: string,
  ) {
    if (!this.bot) {
      this.logger.warn('Cannot send document — bot not configured');
      return;
    }

    try {
      await this.bot.telegram.sendDocument(
        chatId,
        { source: fileBuffer, filename },
        { caption },
      );
      this.logger.log(`Document "${filename}" sent to chat ${chatId}`);
    } catch (error) {
      const errMsg = error instanceof Error ? error.message : String(error);
      this.logger.error(`Failed to send document: ${errMsg}`);
      throw error;
    }
  }

  onModuleDestroy() {
    this.bot?.stop('Module destroy');
  }
}
