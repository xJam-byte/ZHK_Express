import {
  Controller,
  Get,
  Post,
  Patch,
  Param,
  Body,
  Req,
  Query,
  UseGuards,
  ParseIntPipe,
} from '@nestjs/common';
import { OrdersService } from './orders.service';
import { CreateOrderDto } from './dto/create-order.dto';
import { TelegramAuthGuard, Roles } from '../auth/telegram-auth.guard';
import { OrderStatus, Role } from '@prisma/client';

@Controller('api/orders')
@UseGuards(TelegramAuthGuard)
export class OrdersController {
  constructor(private readonly ordersService: OrdersService) {}

  @Post()
  async createOrder(@Req() req: any, @Body() dto: CreateOrderDto) {
    return this.ordersService.createOrder(req.user.id, dto);
  }

  @Get()
  async getOrders(
    @Req() req: any,
    @Query('history') history?: string,
  ) {
    return this.ordersService.getOrders(
      req.user.role,
      req.user.id,
      history === 'true',
    );
  }

  @Get(':id')
  async getOrderById(
    @Req() req: any,
    @Param('id', ParseIntPipe) id: number,
  ) {
    return this.ordersService.getOrderById(id, req.user.id, req.user.role);
  }

  @Patch(':id/status')
  @Roles(Role.SHOP, Role.ADMIN)
  async updateStatus(
    @Param('id', ParseIntPipe) id: number,
    @Body('status') status: OrderStatus,
  ) {
    return this.ordersService.updateStatus(id, status);
  }

  @Patch(':id/rate')
  async rateOrder(
    @Req() req: any,
    @Param('id', ParseIntPipe) id: number,
    @Body('rating') rating: number,
    @Body('review') review?: string,
  ) {
    return this.ordersService.rateOrder(id, req.user.id, rating, review);
  }

  @Get('shop/:shopId/reviews')
  async getShopReviews(@Param('shopId', ParseIntPipe) shopId: number) {
    return this.ordersService.getShopReviews(shopId);
  }

  @Get('shop/:shopId/rating')
  async getShopRating(@Param('shopId', ParseIntPipe) shopId: number) {
    return this.ordersService.getShopRatingStats(shopId);
  }
}
