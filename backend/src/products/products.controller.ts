import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Param,
  Body,
  Req,
  UseGuards,
  UseInterceptors,
  UploadedFile,
  ParseIntPipe,
  BadRequestException,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ProductsService } from './products.service';
import { TelegramAuthGuard, Roles } from '../auth/telegram-auth.guard';
import { Role } from '@prisma/client';

@Controller('api/products')
export class ProductsController {
  constructor(private readonly productsService: ProductsService) {}

  @Get()
  async findAll() {
    return this.productsService.findAll(true);
  }

  @Get('all')
  @UseGuards(TelegramAuthGuard)
  @Roles(Role.ADMIN, Role.SHOP)
  async findAllIncludingInactive(@Req() req: any) {
    const user = req.user;
    // SHOP users only see their own products
    if (user.role === Role.SHOP) {
      return this.productsService.findByShopUser(user.id);
    }
    return this.productsService.findAll(false);
  }

  @Post('import')
  @UseGuards(TelegramAuthGuard)
  @Roles(Role.ADMIN, Role.SHOP)
  @UseInterceptors(
    FileInterceptor('file', {
      limits: { fileSize: 10 * 1024 * 1024 }, // 10MB
      fileFilter: (_req, file, cb) => {
        const allowedMimes = [
          'text/csv',
          'application/vnd.ms-excel',
          'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
          'application/octet-stream',
        ];
        if (allowedMimes.includes(file.mimetype)) {
          cb(null, true);
        } else {
          cb(new BadRequestException('Only CSV and Excel files are allowed'), false);
        }
      },
    }),
  )
  async importProducts(@Req() req: any, @UploadedFile() file: Express.Multer.File) {
    if (!file) {
      throw new BadRequestException('File is required');
    }
    const user = req.user;
    // Determine shopId for the importing user
    let shopId: number | undefined;
    if (user.role === Role.SHOP) {
      const shop = await this.productsService.getShopByUserId(user.id);
      if (shop) shopId = shop.id;
    }
    return this.productsService.importFromFile(file, shopId);
  }

  @Patch(':id/toggle')
  @UseGuards(TelegramAuthGuard)
  @Roles(Role.ADMIN, Role.SHOP)
  async toggleActive(
    @Param('id', ParseIntPipe) id: number,
    @Body('isActive') isActive: boolean,
  ) {
    return this.productsService.toggleActive(id, isActive);
  }

  @Patch(':id')
  @UseGuards(TelegramAuthGuard)
  @Roles(Role.ADMIN, Role.SHOP)
  async updateProduct(
    @Param('id', ParseIntPipe) id: number,
    @Body() body: { price?: number; stock?: number; name?: string },
  ) {
    return this.productsService.updateProduct(id, body);
  }

  @Delete(':id')
  @UseGuards(TelegramAuthGuard)
  @Roles(Role.ADMIN)
  async deleteProduct(@Param('id', ParseIntPipe) id: number) {
    return this.productsService.deleteProduct(id);
  }
}
