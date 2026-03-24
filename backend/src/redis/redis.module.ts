import { Module, Global } from '@nestjs/common';
import { CacheModule } from '@nestjs/cache-manager';
import * as redisStore from 'cache-manager-redis-yet';

@Global()
@Module({
  imports: [
    CacheModule.registerAsync({
      isGlobal: true,
      useFactory: async () => {
        if (process.env.REDIS_HOST) {
          return {
            store: await redisStore.redisStore({
              socket: {
                host: process.env.REDIS_HOST,
                port: process.env.REDIS_PORT ? parseInt(process.env.REDIS_PORT, 10) : 6379,
              },
              ttl: 60 * 5, // 5 minutes default
            }),
          };
        }
        return {
          ttl: 60 * 5,
        };
      },
    }),
  ],
  exports: [CacheModule],
})
export class RedisCacheModule {}
