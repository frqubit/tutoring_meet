import { MiddlewareConsumer, Module, NestModule } from '@nestjs/common';
import { DEV } from './config';
import { Injectable, Logger, NestMiddleware } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import { ROOT_MODULE_IMPORTS } from './utils/app_utils';

@Module({
  imports: ROOT_MODULE_IMPORTS(),
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    if (DEV) {
      consumer.apply(LoggerMiddleware).forRoutes('*');
    }
  }
}

@Injectable()
export class LoggerMiddleware implements NestMiddleware {
  private logger = new Logger('HTTP');

  use(req: Request, res: Response, next: NextFunction) {
    this.logger.log(`${req.method} ${req.originalUrl}`);
    next();
  }
}
