import { MiddlewareConsumer, Module } from '@nestjs/common';
import { SessionServiceModule } from './Session.service';
import { SessionController } from './Session.controller';
import { AuthModule } from '../auth/Auth.module';
import { AuthMiddleware } from '../auth/Auth.guard';
import { E2E } from '@/src/config';
import { ClientServiceModule } from '../client/Client.service';
import { StudentServiceModule } from '../student/Student.service';

@Module({
  imports: [
    SessionServiceModule,
    ClientServiceModule,
    StudentServiceModule,
    AuthModule,
  ],
  controllers: [SessionController],
})
export class SessionModule {
  configure(consumer: MiddlewareConsumer) {
    if (!E2E) {
      consumer.apply(AuthMiddleware).forRoutes(SessionController);
    }
  }
}
