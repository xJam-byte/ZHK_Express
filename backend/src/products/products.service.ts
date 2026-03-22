import {
  Injectable,
  Logger,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { Readable } from 'stream';
import * as csvParser from 'csv-parser';
import * as XLSX from 'xlsx';

interface ImportRow {
  name: string;
  price: number;
  stock?: number;
  imageUrl?: string;
}

export interface ImportResult {
  total: number;
  created: number;
  updated: number;
  errors: string[];
}

@Injectable()
export class ProductsService {
  private readonly logger = new Logger(ProductsService.name);

  constructor(private readonly prisma: PrismaService) {}

  async findAll(onlyActive = true) {
    const where: any = {};
    if (onlyActive) {
      where.isActive = true;
      // Only show products from active shops (or products without a shop)
      where.OR = [
        { shop: null },
        { shop: { isActive: true } },
      ];
    }
    return this.prisma.product.findMany({
      where,
      orderBy: { name: 'asc' },
    });
  }

  async findByShopUser(userId: number) {
    const shop = await this.prisma.shop.findUnique({
      where: { userId },
    });
    if (!shop) return [];
    return this.prisma.product.findMany({
      where: { shopId: shop.id },
      orderBy: { name: 'asc' },
    });
  }

  async findById(id: number) {
    return this.prisma.product.findUnique({ where: { id } });
  }

  async getShopByUserId(userId: number) {
    return this.prisma.shop.findUnique({ where: { userId } });
  }

  async importFromFile(file: Express.Multer.File, shopId?: number): Promise<ImportResult> {
    const ext = file.originalname.split('.').pop()?.toLowerCase();

    let rows: ImportRow[];
    if (ext === 'csv') {
      rows = await this.parseCsv(file.buffer);
    } else if (ext === 'xlsx' || ext === 'xls') {
      rows = this.parseExcel(file.buffer);
    } else {
      throw new BadRequestException(
        'Unsupported file format. Use CSV or Excel (.xlsx/.xls)',
      );
    }

    if (rows.length === 0) {
      throw new BadRequestException('File is empty or has invalid format');
    }

    return this.upsertProducts(rows, shopId);
  }

  private async parseCsv(buffer: Buffer): Promise<ImportRow[]> {
    return new Promise((resolve, reject) => {
      const rows: ImportRow[] = [];
      const stream = Readable.from(buffer.toString());

      stream
        .pipe(
          csvParser({
            mapHeaders: ({ header }) => header.trim().toLowerCase(),
          }),
        )
        .on('data', (row) => {
          const parsed = this.normalizeRow(row);
          if (parsed) rows.push(parsed);
        })
        .on('end', () => resolve(rows))
        .on('error', (err) => reject(err));
    });
  }

  private parseExcel(buffer: Buffer): ImportRow[] {
    const workbook = XLSX.read(buffer, { type: 'buffer' });
    const sheetName = workbook.SheetNames[0];
    const sheet = workbook.Sheets[sheetName];
    const jsonData = XLSX.utils.sheet_to_json<Record<string, any>>(sheet);

    const rows: ImportRow[] = [];
    for (const row of jsonData) {
      // Normalize keys to lowercase
      const normalized: Record<string, any> = {};
      for (const key of Object.keys(row)) {
        normalized[key.trim().toLowerCase()] = row[key];
      }
      const parsed = this.normalizeRow(normalized);
      if (parsed) rows.push(parsed);
    }
    return rows;
  }

  private normalizeRow(row: Record<string, any>): ImportRow | null {
    const name =
      row['name'] || row['название'] || row['наименование'] || row['товар'];
    const price =
      row['price'] || row['цена'] || row['стоимость'];
    const stock =
      row['stock'] || row['остаток'] || row['количество'] || row['кол-во'];
    const imageUrl = row['image_url'] || row['изображение'] || row['фото'];

    if (!name || price === undefined || price === null) {
      return null;
    }

    const parsedPrice = parseFloat(String(price));
    if (isNaN(parsedPrice) || parsedPrice < 0) {
      return null;
    }

    return {
      name: String(name).trim(),
      price: parsedPrice,
      stock: stock ? parseInt(String(stock), 10) || 0 : 0,
      imageUrl: imageUrl ? String(imageUrl).trim() : undefined,
    };
  }

  private async upsertProducts(rows: ImportRow[], shopId?: number): Promise<ImportResult> {
    const result: ImportResult = {
      total: rows.length,
      created: 0,
      updated: 0,
      errors: [],
    };

    for (const row of rows) {
      try {
        const existing = await this.prisma.product.findUnique({
          where: { name: row.name },
        });

        if (existing) {
          await this.prisma.product.update({
            where: { name: row.name },
            data: {
              price: row.price,
              stock: row.stock ?? existing.stock,
              imageUrl: row.imageUrl ?? existing.imageUrl,
              isActive: true,
              ...(shopId !== undefined ? { shopId } : {}),
            },
          });
          result.updated++;
        } else {
          await this.prisma.product.create({
            data: {
              name: row.name,
              price: row.price,
              stock: row.stock ?? 0,
              imageUrl: row.imageUrl,
              isActive: true,
              ...(shopId !== undefined ? { shopId } : {}),
            },
          });
          result.created++;
        }
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        result.errors.push(`Error processing "${row.name}": ${message}`);
        this.logger.error(`Import error for "${row.name}": ${message}`);
      }
    }

    this.logger.log(
      `Import complete: ${result.created} created, ${result.updated} updated, ${result.errors.length} errors` +
      (shopId ? ` (shopId: ${shopId})` : ''),
    );
    return result;
  }

  async toggleActive(id: number, isActive: boolean) {
    return this.prisma.product.update({
      where: { id },
      data: { isActive },
    });
  }

  async updateProduct(id: number, data: { price?: number; stock?: number; name?: string }) {
    return this.prisma.product.update({
      where: { id },
      data,
    });
  }

  async deleteProduct(id: number) {
    return this.prisma.product.delete({ where: { id } });
  }
}
