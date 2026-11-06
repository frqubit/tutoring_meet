import { Module } from '@nestjs/common';
import { WebDataServiceModule } from './WebData.service';

@Module({
  imports: [WebDataServiceModule],
})
export class WebDataModule {
  // configure(consumer: MiddlewareConsumer) {
  //   consumer.apply(AuthMiddleware).forRoutes(StudentController);
  // }
}
