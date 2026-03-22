import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class ComplexesService {
  private readonly logger = new Logger(ComplexesService.name);

  constructor(private readonly prisma: PrismaService) {}

  async findAll() {
    return this.prisma.residentialComplex.findMany({
      orderBy: { name: 'asc' },
    });
  }

  async resolveByGeo(latitude: number, longitude: number) {
    const complexes = await this.prisma.residentialComplex.findMany();

    let closest: any = null;
    let minDistance = Infinity;

    for (const complex of complexes) {
      const distance = this.haversineDistance(
        latitude,
        longitude,
        complex.latitude,
        complex.longitude,
      );

      if (distance < minDistance) {
        minDistance = distance;
        closest = complex;
      }
    }

    if (closest && minDistance <= closest.radius) {
      this.logger.log(
        `Geo resolved: (${latitude}, ${longitude}) → "${closest.name}" (${Math.round(minDistance)}m)`,
      );
      return { complex: closest, distance: Math.round(minDistance) };
    }

    this.logger.warn(
      `Geo resolve failed: no complex within radius for (${latitude}, ${longitude}). Closest: "${closest?.name}" at ${Math.round(minDistance)}m`,
    );
    return { complex: closest, distance: Math.round(minDistance), outOfRange: true };
  }

  /**
   * Haversine formula — distance between two GPS points in meters
   */
  private haversineDistance(
    lat1: number,
    lon1: number,
    lat2: number,
    lon2: number,
  ): number {
    const R = 6371000; // Earth radius in meters
    const toRad = (deg: number) => (deg * Math.PI) / 180;

    const dLat = toRad(lat2 - lat1);
    const dLon = toRad(lon2 - lon1);

    const a =
      Math.sin(dLat / 2) ** 2 +
      Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;

    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  }
}
