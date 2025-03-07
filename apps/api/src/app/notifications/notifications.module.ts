import { Module } from '@nestjs/common';
import { CoreModule } from '@notification-service/core';
import { ProviderAdaptersModule } from '@notification-service/provider-adapters';
import { NotificationsController } from './notifications.controller';
import { NotificationsService } from './notifications.service';

/**
 * Module for handling notifications
 */
@Module({
  imports: [CoreModule, ProviderAdaptersModule],
  controllers: [NotificationsController],
  providers: [NotificationsService],
  exports: [NotificationsService],
})
export class NotificationsModule {}
