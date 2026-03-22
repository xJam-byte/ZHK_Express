import {
  Controller,
  Get,
  UseGuards,
} from '@nestjs/common';
import { DashboardService } from './dashboard.service';
import { TelegramAuthGuard, Roles } from '../auth/telegram-auth.guard';
import { Role } from '@prisma/client';

@Controller('api/admin')
@UseGuards(TelegramAuthGuard)
@Roles(Role.ADMIN)
export class DashboardController {
  constructor(private readonly dashboardService: DashboardService) {}

  @Get('dashboard')
  async getDashboard() {
    return this.dashboardService.getDashboard();
  }
}
