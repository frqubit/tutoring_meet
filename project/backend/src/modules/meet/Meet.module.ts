import { Module } from '@nestjs/common';
import { MeetGateway } from './Meet.gateway';

@Module({
  providers: [MeetGateway],
})
export class MeetModule {
  // configure(consumer: MiddlewareConsumer) {
  //   consumer.apply(AuthMiddleware).forRoutes(StudentController);
  // }
}
