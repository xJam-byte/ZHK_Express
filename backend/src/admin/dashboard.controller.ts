import {
  Controller,
  Get,
  Post,
  Req,
  UseGuards,
  Header,
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

  @Get('export/orders')
  @Header('Cache-Control', 'no-store, no-cache, must-revalidate')
  async exportOrders() {
    return this.dashboardService.exportOrders();
  }

  @Post('export/send-report')
  async sendReport(@Req() req: any) {
    const adminTelegramId = req.user.telegramId.toString();
    return this.dashboardService.generateAndSendReport(adminTelegramId);
  }
}
