import { Module } from '@nestjs/common';
import { PrismaModule } from './prisma/prisma.module';
import { AuthModule } from './auth/auth.module';
import { ProductsModule } from './products/products.module';
import { OrdersModule } from './orders/orders.module';
import { TelegramModule } from './telegram/telegram.module';

import { ShopsModule } from './shops/shops.module';
import { AdminModule } from './admin/admin.module';
import { RedisCacheModule } from './redis/redis.module';
import { CategoriesModule } from './categories/categories.module';
import { WishlistModule } from './wishlist/wishlist.module';
import { PromocodesModule } from './promocodes/promocodes.module';

@Module({
  imports: [
    RedisCacheModule,
    CategoriesModule,
    WishlistModule,
    PromocodesModule,
    PrismaModule,
    AuthModule,
    ProductsModule,
    OrdersModule,
    TelegramModule,

    ShopsModule,
    AdminModule,
  ],
})
export class AppModule {}
