import {
  Controller,
  Get,
  Patch,
  Body,
  Req,
  UseGuards,
} from '@nestjs/common';
import { TelegramAuthGuard } from './telegram-auth.guard';
import { PrismaService } from '../prisma/prisma.service';

@Controller('api/auth')
@UseGuards(TelegramAuthGuard)
export class AuthController {
  constructor(private readonly prisma: PrismaService) {}

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
      selectedShopId: user.selectedShopId,
      entrance: user.entrance,
      floor: user.floor,
      apartment: user.apartment,
    };
  }

  @Patch('address')
  async saveAddress(
    @Req() req: any,
    @Body()
    body: {
      shopId: number;
      entrance: string;
      floor: string;
      apartment: string;
      comment?: string;
    },
  ) {
    const user = req.user;

    const updated = await this.prisma.user.update({
      where: { id: user.id },
      data: {
        selectedShopId: body.shopId,
        entrance: body.entrance,
        floor: body.floor,
        apartment: body.apartment,
        address: body.comment || null,
      },
    });

    return {
      id: updated.id,
      selectedShopId: updated.selectedShopId,
      entrance: updated.entrance,
      floor: updated.floor,
      apartment: updated.apartment,
      address: updated.address,
    };
  }
}
