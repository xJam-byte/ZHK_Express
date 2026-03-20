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
    return this.prisma.product.findMany({
      where: onlyActive ? { isActive: true } : {},
      orderBy: { name: 'asc' },
    });
  }

  async findById(id: number) {
    return this.prisma.product.findUnique({ where: { id } });
  }

  async importFromFile(file: Express.Multer.File): Promise<ImportResult> {
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

    return this.upsertProducts(rows);
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

  private async upsertProducts(rows: ImportRow[]): Promise<ImportResult> {
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
      `Import complete: ${result.created} created, ${result.updated} updated, ${result.errors.length} errors`,
    );
    return result;
  }

  async toggleActive(id: number, isActive: boolean) {
    return this.prisma.product.update({
      where: { id },
      data: { isActive },
    });
  }

  async deleteProduct(id: number) {
    return this.prisma.product.delete({ where: { id } });
  }
}
