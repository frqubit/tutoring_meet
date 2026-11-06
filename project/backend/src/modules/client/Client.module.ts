import { MiddlewareConsumer, Module } from '@nestjs/common';
import { ClientController } from './Client.controller';
import { DepositServiceModule } from '../deposit/Deposit.service';
import { SessionServiceModule } from '../session/Session.service';
import { AuthModule } from '../auth/Auth.module';
import { AuthMiddleware } from '../auth/Auth.guard';
import { ClientServiceModule } from './Client.service';
import { E2E } from '@/src/config';

@Module({
  imports: [
    ClientServiceModule,
    DepositServiceModule,
    SessionServiceModule,
    AuthModule,
  ],
  controllers: [ClientController],
})
export class ClientModule {
  configure(consumer: MiddlewareConsumer) {
    if (!E2E) {
      consumer.apply(AuthMiddleware).forRoutes(ClientController);
    }
  }
}
