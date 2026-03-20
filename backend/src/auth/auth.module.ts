import { Module } from '@nestjs/common';
import { TelegramAuthGuard } from './telegram-auth.guard';
import { AuthController } from './auth.controller';

@Module({
  controllers: [AuthController],
  providers: [TelegramAuthGuard],
  exports: [TelegramAuthGuard],
})
export class AuthModule {}
