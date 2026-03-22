import { Module } from '@nestjs/common';
import { ShopsService } from './shops.service';
import { ShopsAdminController, ShopsPublicController } from './shops.controller';

@Module({
  controllers: [ShopsAdminController, ShopsPublicController],
  providers: [ShopsService],
  exports: [ShopsService],
})
export class ShopsModule {}
