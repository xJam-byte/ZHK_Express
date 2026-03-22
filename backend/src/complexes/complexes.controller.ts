import {
  Controller,
  Get,
  Post,
  Body,
} from '@nestjs/common';
import { ComplexesService } from './complexes.service';

@Controller('api/complexes')
export class ComplexesController {
  constructor(private readonly complexesService: ComplexesService) {}

  @Get()
  async findAll() {
    return this.complexesService.findAll();
  }

  @Post('resolve-geo')
  async resolveGeo(
    @Body() body: { latitude: number; longitude: number },
  ) {
    return this.complexesService.resolveByGeo(body.latitude, body.longitude);
  }
}
