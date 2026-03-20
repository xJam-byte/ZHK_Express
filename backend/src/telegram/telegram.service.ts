import { Injectable, Logger } from '@nestjs/common';
import { Telegraf, Markup } from 'telegraf';

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

  async notifyNewOrder(order: any) {
    const chatId = process.env.TELEGRAM_SHOP_CHAT_ID;
    if (!this.bot || !chatId) {
      this.logger.warn('Cannot send notification — bot or chat ID not configured');
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
          Markup.button.webApp('📋 Открыть заказ', `${webAppUrl}/shop`),
        ]),
      });
      this.logger.log(`Notification sent for order #${order.id}`);
    } catch (error) {
      const errMsg = error instanceof Error ? error.message : String(error);
      this.logger.error(`Failed to send notification: ${errMsg}`);
    }
  }

  onModuleDestroy() {
    this.bot?.stop('Module destroy');
  }
}
