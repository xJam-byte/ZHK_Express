import { Controller, Get, Post, Param, Delete, UseGuards, Request } from '@nestjs/common';
import { WishlistService } from './wishlist.service';
import { TelegramAuthGuard } from '../auth/telegram-auth.guard';

@Controller('api/wishlist')
@UseGuards(TelegramAuthGuard)
export class WishlistController {
  constructor(private readonly wishlistService: WishlistService) {}

  @Get()
  getWishlist(@Request() req: any) {
    return this.wishlistService.getWishlist(req.user.id);
  }

  @Post(':productId/toggle')
  toggleWishlisted(@Request() req: any, @Param('productId') productId: string) {
    return this.wishlistService.toggleWishlisted(req.user.id, +productId);
  }
}
