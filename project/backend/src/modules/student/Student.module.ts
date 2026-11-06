import { MiddlewareConsumer, Module } from '@nestjs/common';
import { StudentServiceModule } from './Student.service';
import { StudentController } from './Student.controller';
import { DepositServiceModule } from '../deposit/Deposit.service';
import { SessionServiceModule } from '../session/Session.service';
import { AuthModule } from '../auth/Auth.module';
import { AuthMiddleware } from '../auth/Auth.guard';
import { E2E } from '@/src/config';
import { ClientServiceModule } from '../client/Client.service';

@Module({
  imports: [
    StudentServiceModule,
    DepositServiceModule,
    SessionServiceModule,
    ClientServiceModule,
    AuthModule,
  ],
  controllers: [StudentController],
})
export class StudentModule {
  configure(consumer: MiddlewareConsumer) {
    if (!E2E) {
      consumer.apply(AuthMiddleware).forRoutes(StudentController);
    }
  }
}
