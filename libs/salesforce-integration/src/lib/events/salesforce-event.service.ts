import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios from 'axios';
import { SalesforceAuthService } from '../auth/salesforce-auth.service';

/**
 * Interface for Salesforce notification event
 */
export interface SalesforceNotificationEvent {
  /**
   * Type of the notification event
   * @example "evt.nao.application.update"
   */
  type: string;

  /**
   * Data payload for the notification
   * This should be a JSON string
   */
  data: string;
}

/**
 * Service for sending events to Salesforce Platform Events
 */
@Injectable()
export class SalesforceEventService {
  private readonly logger = new Logger(SalesforceEventService.name);

  /**
   * Constructor for SalesforceEventService
   * @param configService NestJS config service for retrieving configuration
   * @param authService Salesforce authentication service
   */
  constructor(
    private readonly configService: ConfigService,
    private readonly authService: SalesforceAuthService,
  ) {}

  /**
   * Send a notification event to Salesforce Platform Events
   * @param event The notification event to send
   * @returns A promise that resolves to true if the event was sent successfully
   * @throws Error if the event could not be sent
   * @example
   * const result = await salesforceEventService.sendNotificationEvent({
   *   type: 'evt.nao.application.update',
   *   data: JSON.stringify({ key: 'value' })
   * });
   */
  async sendNotificationEvent(
    event: SalesforceNotificationEvent,
  ): Promise<boolean> {
    try {
      this.logger.debug(
        `Sending notification event to Salesforce: ${event.type}`,
      );

      // Get the Salesforce API version and event object name from configuration
      const apiVersion = this.configService.get<string>(
        'SALESFORCE_API_VERSION',
        'v63.0',
      );
      const eventObjectName = this.configService.get<string>(
        'SALESFORCE_EVENT_OBJECT',
        'tyfonenao__Notification__e',
      );

      // Get the access token and instance URL
      const accessToken = await this.authService.getAccessToken();
      const instanceUrl = this.authService.getInstanceUrl();

      // Construct the event endpoint URL
      const eventUrl = `${instanceUrl}/services/data/${apiVersion}/sobjects/${eventObjectName}`;

      // Prepare the event payload
      const eventPayload = {
        tyfonenao__Type__c: event.type,
        tyfonenao__Data__c: event.data,
      };

      // Send the event to Salesforce
      const response = await axios.post(eventUrl, eventPayload, {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
      });

      // Check if the event was sent successfully
      if (response.status === 201) {
        this.logger.debug(
          `Successfully sent notification event to Salesforce: ${event.type}`,
        );
        return true;
      } else {
        throw new Error(`Unexpected response status: ${response.status}`);
      }
    } catch (error: unknown) {
      // Type guard for error object
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';
      const errorStack = error instanceof Error ? error.stack : undefined;

      this.logger.error(
        `Failed to send notification event to Salesforce: ${errorMessage}`,
        errorStack,
      );
      throw new Error(
        `Failed to send notification event to Salesforce: ${errorMessage}`,
      );
    }
  }
}
