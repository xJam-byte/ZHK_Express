import {
  Controller,
  Get,
  Patch,
  Post,
  Param,
  Body,
  UseGuards,
  ParseIntPipe,
} from '@nestjs/common';
import { ShopsService } from './shops.service';
import { TelegramAuthGuard, Roles } from '../auth/telegram-auth.guard';
import { Role } from '@prisma/client';

@Controller('api/shops')
export class ShopsPublicController {
  constructor(private readonly shopsService: ShopsService) {}

  @Get()
  async findAllActive() {
    return this.shopsService.findAllActive();
  }

  @Post('resolve-geo')
  async resolveGeo(
    @Body() body: { latitude: number; longitude: number },
  ) {
    return this.shopsService.resolveByGeo(body.latitude, body.longitude);
  }
}

@Controller('api/admin/shops')
@UseGuards(TelegramAuthGuard)
@Roles(Role.ADMIN)
export class ShopsAdminController {
  constructor(private readonly shopsService: ShopsService) {}

  @Get()
  async findAll() {
    return this.shopsService.findAll();
  }

  @Patch(':id/suspend')
  async suspend(@Param('id', ParseIntPipe) id: number) {
    return this.shopsService.suspend(id);
  }

  @Patch(':id/resume')
  async resume(@Param('id', ParseIntPipe) id: number) {
    return this.shopsService.resume(id);
  }
}
