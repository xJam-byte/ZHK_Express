import 'dotenv/config';
import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  app.enableCors({
    origin: true, // Allow all origins (needed: frontend and backend on different domains)
    credentials: true,
  });

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: { enableImplicitConversion: true },
    }),
  );

  // Handle BigInt serialization
  (BigInt.prototype as any).toJSON = function () {
    return this.toString();
  };

  const port = process.env.PORT || 3001;
  await app.listen(port);
  console.log(`🚀 JK-Express API running on http://localhost:${port}`);
}

bootstrap();
