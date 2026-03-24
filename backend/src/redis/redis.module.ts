import { Module, Global } from '@nestjs/common';
import { CacheModule } from '@nestjs/cache-manager';
import * as redisStore from 'cache-manager-redis-store';

@Global()
@Module({
  imports: [
    CacheModule.register({
      isGlobal: true,
      store: redisStore as any,
      host: process.env.REDIS_HOST || 'localhost',
      port: process.env.REDIS_PORT ? parseInt(process.env.REDIS_PORT, 10) : 6379,
      ttl: 60 * 5, // 5 minutes default
    }),
  ],
  exports: [CacheModule],
})
export class RedisCacheModule {}
