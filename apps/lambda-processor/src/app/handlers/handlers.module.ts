import { Module } from '@nestjs/common';
import { CoreModule } from '@notification-service/core';
import { NotificationHandler } from './notification.handler';

/**
 * Module for Lambda handlers
 */
@Module({
  imports: [CoreModule],
  providers: [NotificationHandler],
  exports: [NotificationHandler],
})
export class HandlersModule {}
