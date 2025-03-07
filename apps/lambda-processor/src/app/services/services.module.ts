import { Module } from '@nestjs/common';
import { HandlersModule } from '../handlers/handlers.module';
import { SqsSubscriberService } from './sqs-subscriber.service';

@Module({
  imports: [HandlersModule],
  providers: [SqsSubscriberService],
  exports: [SqsSubscriberService],
})
export class ServicesModule {}
