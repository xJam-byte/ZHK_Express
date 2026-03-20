import { Module } from '@nestjs/common';
import { TelegramAuthGuard } from './telegram-auth.guard';

@Module({
  providers: [TelegramAuthGuard],
  exports: [TelegramAuthGuard],
})
export class AuthModule {}
