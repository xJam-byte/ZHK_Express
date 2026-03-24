import { Controller, Get, Post, Body, Patch, Param, Delete, UseGuards } from '@nestjs/common';
import { CategoriesService } from './categories.service';
import { TelegramAuthGuard, Roles } from '../auth/telegram-auth.guard';

@Controller('api/categories')
export class CategoriesController {
  constructor(private readonly categoriesService: CategoriesService) {}

  @Get()
  findAll() {
    return this.categoriesService.findAll();
  }

  @Post()
  @UseGuards(TelegramAuthGuard)
  @Roles('ADMIN')
  create(@Body() createCategoryDto: { name: string; nameKk?: string; nameEn?: string; imageUrl?: string }) {
    return this.categoriesService.create(createCategoryDto);
  }

  @Patch(':id')
  @UseGuards(TelegramAuthGuard)
  @Roles('ADMIN')
  update(
    @Param('id') id: string,
    @Body() updateCategoryDto: { name?: string; nameKk?: string; nameEn?: string; imageUrl?: string }
  ) {
    return this.categoriesService.update(+id, updateCategoryDto);
  }

  @Delete(':id')
  @UseGuards(TelegramAuthGuard)
  @Roles('ADMIN')
  remove(@Param('id') id: string) {
    return this.categoriesService.remove(+id);
  }
}
