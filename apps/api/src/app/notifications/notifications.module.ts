import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { NotificationsController } from './notifications.controller';
import { NotificationsService } from './notifications.service';
import { ValidationService } from '@notification-service/core';
import { SnsProviderAdapter } from '@notification-service/provider-adapters';

/**
 * Module for handling notifications
 */
@Module({
  imports: [ConfigModule],
  controllers: [NotificationsController],
  providers: [NotificationsService, ValidationService, SnsProviderAdapter],
})
export class NotificationsModule {}
