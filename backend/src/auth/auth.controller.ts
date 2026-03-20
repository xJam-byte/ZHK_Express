import {
  Controller,
  Get,
  Req,
  UseGuards,
} from '@nestjs/common';
import { TelegramAuthGuard } from './telegram-auth.guard';

@Controller('api/auth')
@UseGuards(TelegramAuthGuard)
export class AuthController {
  @Get('me')
  async getMe(@Req() req: any) {
    const user = req.user;
    return {
      id: user.id,
      telegramId: user.telegramId.toString(),
      firstName: user.firstName,
      lastName: user.lastName,
      username: user.username,
      role: user.role,
      address: user.address,
    };
  }
}
