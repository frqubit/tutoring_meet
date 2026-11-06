import { MiddlewareConsumer, Module } from '@nestjs/common';
import { DepositServiceModule } from './Deposit.service';
import { DepositController } from './Deposit.controller';
import { StudentServiceModule } from '../student/Student.service';
import { AuthModule } from '../auth/Auth.module';
import { AuthMiddleware } from '../auth/Auth.guard';
import { E2E } from '@/src/config';
import { ClientServiceModule } from '../client/Client.service';

@Module({
  imports: [
    DepositServiceModule,
    StudentServiceModule,
    ClientServiceModule,
    AuthModule,
  ],
  controllers: [DepositController],
})
export class DepositModule {
  configure(consumer: MiddlewareConsumer) {
    if (!E2E) {
      consumer.apply(AuthMiddleware).forRoutes(DepositController);
    }
  }
}
