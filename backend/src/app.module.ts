import { Module } from '@nestjs/common';
import { PrismaModule } from './prisma/prisma.module';
import { AuthModule } from './auth/auth.module';
import { ProductsModule } from './products/products.module';
import { OrdersModule } from './orders/orders.module';
import { TelegramModule } from './telegram/telegram.module';
import { ComplexesModule } from './complexes/complexes.module';
import { ShopsModule } from './shops/shops.module';
import { AdminModule } from './admin/admin.module';

@Module({
  imports: [
    PrismaModule,
    AuthModule,
    ProductsModule,
    OrdersModule,
    TelegramModule,
    ComplexesModule,
    ShopsModule,
    AdminModule,
  ],
})
export class AppModule {}
