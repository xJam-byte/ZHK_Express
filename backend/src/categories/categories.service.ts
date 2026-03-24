import { Injectable, Inject } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { Cache } from 'cache-manager';

@Injectable()
export class CategoriesService {
  constructor(
    private prisma: PrismaService,
    @Inject(CACHE_MANAGER) private cacheManager: Cache,
  ) {}

  async findAll() {
    // Check cache first
    const cachedCategories = await this.cacheManager.get('all_categories');
    if (cachedCategories) {
      return cachedCategories;
    }

    const categories = await this.prisma.category.findMany({
      orderBy: { id: 'asc' },
    });

    // Save to cache for 1 hour
    await this.cacheManager.set('all_categories', categories, 3600);

    return categories;
  }

  async create(data: { name: string; nameKk?: string; nameEn?: string; imageUrl?: string }) {
    const category = await this.prisma.category.create({ data });
    await this.cacheManager.del('all_categories'); // Invalidate cache
    return category;
  }

  async update(id: number, data: { name?: string; nameKk?: string; nameEn?: string; imageUrl?: string }) {
    const category = await this.prisma.category.update({
      where: { id },
      data,
    });
    await this.cacheManager.del('all_categories'); // Invalidate cache
    return category;
  }

  async remove(id: number) {
    const category = await this.prisma.category.delete({ where: { id } });
    await this.cacheManager.del('all_categories'); // Invalidate cache
    return category;
  }
}
