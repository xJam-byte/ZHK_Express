import { Module } from '@nestjs/common';
import { OrdersController } from './orders.controller';
import { OrdersService } from './orders.service';
import { SlaMonitorService } from './sla-monitor.service';
import { TelegramModule } from '../telegram/telegram.module';
import { OrdersGateway } from './orders.gateway';
import { PromocodesModule } from '../promocodes/promocodes.module';

@Module({
  imports: [TelegramModule, PromocodesModule],
  controllers: [OrdersController],
  providers: [OrdersService, SlaMonitorService, OrdersGateway],
})
export class OrdersModule {}
