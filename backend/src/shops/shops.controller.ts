import {
  Controller,
  Get,
  Patch,
  Param,
  UseGuards,
  ParseIntPipe,
} from '@nestjs/common';
import { ShopsService } from './shops.service';
import { TelegramAuthGuard, Roles } from '../auth/telegram-auth.guard';
import { Role } from '@prisma/client';

@Controller('api/admin/shops')
@UseGuards(TelegramAuthGuard)
@Roles(Role.ADMIN)
export class ShopsController {
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
