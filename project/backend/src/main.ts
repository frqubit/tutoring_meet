import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import cookieParser from 'cookie-parser';
import { NestExpressApplication } from '@nestjs/platform-express';
import { WEBSITE_URI } from './config';

import dayjs from 'dayjs';
import utc from 'dayjs/plugin/utc';
import timezone from 'dayjs/plugin/timezone';

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule, {
    rawBody: true,
  });
  app.enableCors({
    credentials: true,
    origin: WEBSITE_URI,
  });
  app.use(cookieParser());
  app.useBodyParser('text');
  dayjs.extend(utc);
  dayjs.extend(timezone);
  await app.listen(process.env.PORT ?? 3000);
}
bootstrap();
