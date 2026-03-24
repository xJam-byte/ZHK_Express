import { Module } from '@nestjs/common';
import { PromocodesService } from './promocodes.service';
import { PromocodesController } from './promocodes.controller';
import { TelegramModule } from '../telegram/telegram.module';

@Module({
  imports: [TelegramModule],
  controllers: [PromocodesController],
  providers: [PromocodesService],
  exports: [PromocodesService]
})
export class PromocodesModule {}
