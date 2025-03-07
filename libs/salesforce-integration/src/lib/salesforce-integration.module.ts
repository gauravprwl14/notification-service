import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { SalesforceAuthService } from './auth/salesforce-auth.service';
import { SalesforceEventService } from './events/salesforce-event.service';

/**
 * Module for Salesforce integration
 * Provides services for authenticating with Salesforce and sending platform events
 */
@Module({
  imports: [ConfigModule],
  providers: [SalesforceAuthService, SalesforceEventService],
  exports: [SalesforceAuthService, SalesforceEventService],
})
export class SalesforceIntegrationModule {}
