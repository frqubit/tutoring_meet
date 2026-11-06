import { Module } from '@nestjs/common';
import { AuthController } from './Auth.controller';
import { AuthServiceModule } from './Auth.service';
import { AuthGuard } from './Auth.guard';

@Module({
  imports: [AuthServiceModule],
  controllers: [AuthController],
  providers: [AuthGuard],
  exports: [AuthGuard, AuthServiceModule],
})
export class AuthModule {}
