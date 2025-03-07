import { Injectable, Logger, Inject } from '@nestjs/common';
import { SQSEvent, SQSRecord } from 'aws-lambda';
import {
  NotificationEvent,
  EncryptionService,
  EncryptionContext,
} from '@notification-service/core';

/**
 * Handler for processing notifications in Lambda
 */
@Injectable()
export class NotificationHandler {
  private readonly logger = new Logger(NotificationHandler.name);

  /**
   * Constructor for NotificationHandler
   * @param encryptionService Encryption service for decrypting payloads
   */
  constructor(
    @Inject('ENCRYPTION_SERVICE')
    private readonly encryptionService: EncryptionService,
  ) {}

  /**
   * Process an SQS event containing notifications
   * @param event The SQS event from Lambda
   * @returns A promise that resolves when processing is complete
   */
  async processSqsEvent(event: SQSEvent): Promise<void> {
    this.logger.debug(
      `Processing SQS event with ${event.Records.length} records`,
    );

    // Log the full event for debugging
    this.logger.debug('Full SQS event:', JSON.stringify(event, null, 2));

    // Process each record in the event
    for (const record of event.Records) {
      await this.processRecord(record);
    }

    this.logger.debug('Finished processing SQS event');
  }

  /**
   * Validate the notification event structure
   * @param event The notification event to validate
   * @throws Error if the event is invalid
   */
  private validateNotificationEvent(event: any): event is NotificationEvent {
    this.logger.debug('Validating notification event:', JSON.stringify(event));
    if (!event) {
      throw new Error('Notification event is null or undefined');
    }

    if (!event.id) {
      throw new Error('Notification event is missing id');
    }

    if (!event.type) {
      throw new Error('Notification event is missing type');
    }

    if (!event.version) {
      throw new Error('Notification event is missing version');
    }

    if (!event.source) {
      throw new Error('Notification event is missing source');
    }

    if (!event.tenant) {
      throw new Error('Notification event is missing tenant information');
    }

    const requiredTenantFields = [
      'financialInstitutionId',
      'appId',
      'environment',
    ];
    for (const field of requiredTenantFields) {
      if (!event.tenant[field]) {
        throw new Error(`Notification event tenant is missing ${field}`);
      }
    }

    if (!event.encryptedPayload) {
      throw new Error('Notification event is missing encryptedPayload');
    }

    return true;
  }

  /**
   * Process a single SQS record
   * @param record The SQS record to process
   * @returns A promise that resolves when processing is complete
   */
  private async processRecord(record: SQSRecord): Promise<void> {
    try {
      this.logger.debug(`Processing record with ID ${record.messageId}`);
      this.logger.debug('Record body:', record.body);
      this.logger.debug(
        'Record attributes:',
        JSON.stringify(record.messageAttributes, null, 2),
      );

      // First parse the SNS message envelope
      let snsMessage: any;
      try {
        snsMessage = JSON.parse(record.body);
      } catch (error) {
        throw new Error(
          `Failed to parse SNS message envelope as JSON: ${error.message}`,
        );
      }

      // Then parse the actual notification event from the Message field
      let notificationEvent: any;
      try {
        notificationEvent = JSON.parse(snsMessage.Message);
      } catch (error) {
        throw new Error(
          `Failed to parse SNS Message content as JSON: ${error.message}`,
        );
      }

      // Log the parsed notification event for debugging
      this.logger.debug(
        'Parsed notification event:',
        JSON.stringify(notificationEvent, null, 2),
      );

      // Validate the notification event structure
      this.validateNotificationEvent(notificationEvent);

      // Create the encryption context from the tenant information
      const encryptionContext: EncryptionContext = {
        financialInstitutionId: notificationEvent.tenant.financialInstitutionId,
        appId: notificationEvent.tenant.appId,
        environment: notificationEvent.tenant.environment,
      };

      // Decrypt the payload
      let decryptedPayload: string;
      try {
        decryptedPayload = await this.encryptionService.decrypt(
          notificationEvent.encryptedPayload,
          encryptionContext,
        );
      } catch (error) {
        throw new Error(`Failed to decrypt payload: ${error.message}`);
      }

      // Parse the decrypted payload
      let payload: Record<string, unknown>;
      try {
        payload = JSON.parse(decryptedPayload);
      } catch (error) {
        throw new Error(
          `Failed to parse decrypted payload as JSON: ${error.message}`,
        );
      }

      // Process the notification based on its type
      await this.processNotification(notificationEvent, payload);

      this.logger.debug(
        `Successfully processed record with ID ${record.messageId}`,
      );
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';
      const errorStack = error instanceof Error ? error.stack : undefined;

      this.logger.error(
        `Failed to process record with ID ${record.messageId}: ${errorMessage}`,
        errorStack,
      );

      // In a real implementation, we would send the failed record to a dead-letter queue
      // For now, we'll just log the error and continue
      throw error; // Re-throw to let the SQS subscriber handle the error
    }
  }

  /**
   * Process a notification based on its type
   * @param event The notification event
   * @param payload The decrypted payload
   * @returns A promise that resolves when processing is complete
   */
  private async processNotification(
    event: NotificationEvent,
    payload: Record<string, unknown>,
  ): Promise<void> {
    try {
      this.logger.debug(`Processing notification of type ${event.type}`);
      this.logger.debug(`Notification payload: ${JSON.stringify(payload)}`);

      // Add specific handling for different event types
      switch (event.type) {
        case 'user.update':
          // Handle user update event
          this.logger.debug('Processing user update notification');
          break;
        case 'application.update':
          // Handle application update event
          this.logger.debug('Processing application update notification');
          break;
        default:
          this.logger.warn(`Unknown notification type: ${event.type}`);
      }

      this.logger.debug(
        `Finished processing notification of type ${event.type}`,
      );
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(
        `Error processing notification of type ${event.type}: ${errorMessage}`,
        error instanceof Error ? error.stack : undefined,
      );
      throw error;
    }
  }
}
