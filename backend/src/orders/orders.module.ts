import { Module } from '@nestjs/common';
import { OrdersController } from './orders.controller';
import { OrdersService } from './orders.service';
import { SlaMonitorService } from './sla-monitor.service';
import { TelegramModule } from '../telegram/telegram.module';

@Module({
  imports: [TelegramModule],
  controllers: [OrdersController],
  providers: [OrdersService, SlaMonitorService],
})
export class OrdersModule {}
