import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class WishlistService {
  constructor(private prisma: PrismaService) {}

  async getWishlist(userId: number) {
    const wishes = await this.prisma.wishlist.findMany({
      where: { userId },
      include: {
        product: {
          include: { category: true }
        }
      }
    });
    return wishes.map(w => w.product);
  }

  async toggleWishlisted(userId: number, productId: number) {
    const existing = await this.prisma.wishlist.findUnique({
      where: {
        userId_productId: { userId, productId }
      }
    });

    if (existing) {
      await this.prisma.wishlist.delete({
        where: {
          userId_productId: { userId, productId }
        }
      });
      return { added: false };
    } else {
      await this.prisma.wishlist.create({
        data: { userId, productId }
      });
      return { added: true };
    }
  }
}
