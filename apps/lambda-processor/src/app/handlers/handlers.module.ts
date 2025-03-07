import { Module } from '@nestjs/common';
import { NotificationHandler } from './notification.handler';
import {
  SalesforceIntegrationModule,
  SalesforceEventService,
} from '@notification-service/salesforce-integration';
import { CoreModule } from '@notification-service/core';
import { ConfigModule } from '@nestjs/config';

/**
 * Module for Lambda handlers
 * Configures Salesforce integration and provides notification handling capabilities
 */
@Module({
  imports: [CoreModule, ConfigModule.forRoot(), SalesforceIntegrationModule],
  providers: [
    NotificationHandler,
    {
      provide: 'SALESFORCE_EVENT_SERVICE',
      useExisting: SalesforceEventService,
    },
  ],
  exports: [NotificationHandler, 'SALESFORCE_EVENT_SERVICE'],
})
export class HandlersModule {}
