import { Injectable, Logger, Inject } from '@nestjs/common';
import { SQSEvent, SQSRecord } from 'aws-lambda';
import {
  NotificationEvent,
  KmsEncryptionService as EncryptionService,
  NotificationError,
} from '@notification-service/core';
import { SalesforceEventService } from '@notification-service/salesforce-integration';

/**
 * Interface for Salesforce connection options
 */
interface SalesforceConnectionOptions {
  instanceUrl: string;
  privateKey: string;
  consumerKey: string;
  username: string;
}

/**
 * Supported notification types
 */
export enum NotificationType {
  USER_UPDATE = 'user.update',
  APPLICATION_UPDATE = 'com.tyfone.nao.application.update',
  APPLICATION_CREATE = 'com.tyfone.nao.application.create',
}

/**
 * Interface for SNS Message structure
 */
interface SnsMessage {
  Type: string;
  MessageId: string;
  TopicArn: string;
  Message: string;
  Timestamp: string;
  MessageAttributes?: Record<string, any>;
}

/**
 * Interface for tenant configuration
 */
interface TenantConfig {
  financialInstitutionId: string;
  appId: string;
  environment: string;
  features: {
    encryption: {
      enabled: boolean;
      kmsKeyId?: string;
      algorithm?: string;
    };
    logging: {
      level: 'debug' | 'info' | 'warn' | 'error';
      includePayload: boolean;
    };
  };
}

/**
 * Sample tenant configuration
 */
const SAMPLE_TENANT_CONFIG: TenantConfig = {
  financialInstitutionId: 'acme-bank',
  appId: 'mobile-banking',
  environment: 'production',
  features: {
    encryption: {
      enabled: false, // Disable encryption by default
      kmsKeyId: process.env.KMS_KEY_ID || 'default-key-id',
      algorithm: 'AES256',
    },
    logging: {
      level: 'debug',
      includePayload: true,
    },
  },
};

/**
 * Handler for processing notifications in Lambda
 */
@Injectable()
export class NotificationHandler {
  private readonly logger = new Logger(NotificationHandler.name);

  /**
   * Constructor for NotificationHandler
   * @param encryptionService Encryption service for decrypting payloads
   * @param salesforceEventService Salesforce event service for sending platform events
   */
  constructor(
    @Inject('ENCRYPTION_SERVICE')
    private readonly encryptionService: EncryptionService,
    @Inject('SALESFORCE_EVENT_SERVICE')
    private readonly salesforceEventService: SalesforceEventService,
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
   * @throws NotificationError if the event is invalid
   * @returns true if the event is valid
   */
  private validateNotificationEvent(
    event: any,
  ): event is NotificationEvent<Record<string, unknown>> {
    this.logger.debug('Validating notification event:', JSON.stringify(event));

    try {
      // Check if event exists
      if (!event) {
        throw NotificationError.invalidEvent(
          'Notification event is null or undefined',
        );
      }

      // Validate required top-level fields
      if (!event.id) {
        throw NotificationError.invalidEvent('Missing required field: id');
      }

      if (!event.header) {
        throw NotificationError.invalidEvent('Missing required field: header');
      }

      if (!event.payload) {
        throw NotificationError.invalidEvent('Missing required field: payload');
      }

      // Validate header fields
      const requiredHeaderFields = [
        'event_name',
        'product',
        'product_version',
        'event_version',
        'key_handle',
        'timestamp',
        'callback_ref',
        'alg',
        'typ',
        'tenant',
      ];

      for (const field of requiredHeaderFields) {
        if (!event.header[field]) {
          throw NotificationError.invalidEvent(
            `Missing required header field: ${field}`,
          );
        }
      }

      // Validate tenant information
      const requiredTenantFields = [
        'financialInstitutionId',
        'appId',
        'environment',
      ];

      for (const field of requiredTenantFields) {
        if (!event.header.tenant[field]) {
          throw NotificationError.invalidEvent(
            `Missing required tenant field: ${field}`,
          );
        }
      }

      // Validate payload structure
      if (!event.payload.metadata) {
        throw NotificationError.invalidEvent(
          'Missing required payload field: metadata',
        );
      }

      if (!event.payload.data) {
        throw NotificationError.invalidEvent(
          'Missing required payload field: data',
        );
      }

      if (!event.payload.activityBy) {
        throw NotificationError.invalidEvent(
          'Missing required payload field: activityBy',
        );
      }

      // Validate metadata fields
      const requiredMetadataFields = [
        'docker_container_id',
        'fi_id',
        'config_version',
        'context',
      ];

      for (const field of requiredMetadataFields) {
        if (!event.payload.metadata[field]) {
          throw NotificationError.invalidEvent(
            `Missing required metadata field: ${field}`,
          );
        }
      }

      // Validate metadata context fields
      const requiredContextFields = [
        'deviceId',
        'ip_address',
        'user_agent',
        'hostname',
        'language',
      ];

      for (const field of requiredContextFields) {
        if (!event.payload.metadata.context[field]) {
          throw NotificationError.invalidEvent(
            `Missing required metadata context field: ${field}`,
          );
        }
      }

      // Validate activityBy fields
      const requiredActivityFields = ['source', 'identifier', 'metadata'];
      for (const field of requiredActivityFields) {
        if (!event.payload.activityBy[field]) {
          throw NotificationError.invalidEvent(
            `Missing required activityBy field: ${field}`,
          );
        }
      }

      this.logger.debug('Notification event validation successful');
      return true;
    } catch (error) {
      this.logger.error(
        'Notification event validation failed:',
        error instanceof Error ? error.stack : undefined,
      );
      throw error;
    }
  }

  /**
   * Process a single SQS record
   * @param record The SQS record to process
   * @returns A promise that resolves when processing is complete
   */
  private async processRecord(record: SQSRecord): Promise<void> {
    try {
      this.logger.debug(`Processing record with ID ${record.messageId}`);
      this.logRecordDetails(record);

      const snsMessage = await this.parseSnsMessage(record);
      const notificationEvent = await this.parseNotificationEvent(snsMessage);

      this.validateNotificationEvent(notificationEvent);

      const payload = await this.processPayload(notificationEvent);
      await this.processNotification(notificationEvent, payload);

      this.logger.debug(
        `Successfully processed record with ID ${record.messageId}`,
      );
    } catch (error) {
      this.handleProcessingError(error, record.messageId);
      throw error;
    }
  }

  /**
   * Log record details for debugging
   * @param record The SQS record
   */
  private logRecordDetails(record: SQSRecord): void {
    this.logger.debug('Record body:', record.body);
    this.logger.debug(
      'Record attributes:',
      JSON.stringify(record.messageAttributes, null, 2),
    );
  }

  /**
   * Parse SNS message from SQS record
   * @param record The SQS record
   * @returns Parsed SNS message
   */
  private async parseSnsMessage(record: SQSRecord): Promise<SnsMessage> {
    try {
      this.logger.debug('Parsing SNS message envelope as JSON');
      this.logger.debug('SNS message envelope:', record.body);
      const snsMessage = JSON.parse(record.body);
      return snsMessage;
    } catch (err) {
      throw NotificationError.invalidEvent(
        `Failed to parse SNS message envelope as JSON: ${err instanceof Error ? err.message : 'Unknown error'}`,
        { recordId: record.messageId },
      );
    }
  }

  /**
   * Parse notification event from SNS message
   * @param snsMessage The SNS message
   * @returns Parsed notification event
   */
  private async parseNotificationEvent(
    snsMessage: SnsMessage,
  ): Promise<NotificationEvent> {
    this.logger.debug('Parsing notification event from SNS message');
    this.logger.debug(
      'SNS message content:',
      JSON.stringify(snsMessage, null, 2),
    );

    try {
      let notificationEvent;

      // Check if we're dealing with LocalStack (SNS-wrapped) or direct AWS Lambda event
      if (snsMessage.Type === 'Notification' && snsMessage.Message) {
        // LocalStack format: SNS-wrapped message
        this.logger.debug('Detected LocalStack SNS-wrapped format');
        notificationEvent = JSON.parse(snsMessage.Message);
      } else {
        // AWS format: direct event JSON
        this.logger.debug('Detected AWS direct event format');
        notificationEvent = snsMessage;
      }

      this.logger.debug(
        'Parsed notification event:',
        JSON.stringify(notificationEvent, null, 2),
      );

      return notificationEvent;
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';
      this.logger.error('Failed to parse notification event:', errorMessage);
      throw new Error(`Failed to parse notification event: ${errorMessage}`);
    }
  }

  /**
   * Process the encrypted payload
   * @param notificationEvent The notification event
   * @returns Parsed payload
   */
  private async processPayload(
    notificationEvent: NotificationEvent,
  ): Promise<Record<string, unknown>> {
    const tenantConfig = SAMPLE_TENANT_CONFIG;

    if (!tenantConfig.features.encryption.enabled) {
      try {
        this.logger.debug(
          'Encryption disabled, parsing payload as JSON directly',
        );
        return { data: notificationEvent.payload.data };
      } catch (err) {
        throw NotificationError.invalidEvent(
          `Failed to parse payload as JSON: ${err instanceof Error ? err.message : 'Unknown error'}. Note: Encryption is disabled, expecting plain JSON payload.`,
          { eventId: notificationEvent.id },
        );
      }
    }

    return this.decryptAndParsePayload(notificationEvent);
  }

  /**
   * Decrypt and parse the payload
   * @param notificationEvent The notification event
   * @returns Decrypted and parsed payload
   */
  private async decryptAndParsePayload(
    notificationEvent: NotificationEvent,
  ): Promise<Record<string, unknown>> {
    const encryptionContext = {
      financialInstitutionId:
        notificationEvent.header.tenant.financialInstitutionId,
      appId: notificationEvent.header.tenant.appId,
      environment: notificationEvent.header.tenant.environment,
    };

    try {
      this.logger.debug('Attempting to decrypt payload...');
      const decryptedPayload = await this.encryptionService.decrypt(
        notificationEvent.payload.data as string,
        encryptionContext,
      );
      this.logger.debug('Payload decrypted successfully');

      try {
        const parsedPayload = JSON.parse(decryptedPayload);
        this.logger.debug('Payload parsed successfully');
        return parsedPayload;
      } catch (err) {
        throw NotificationError.invalidEvent(
          `Failed to parse decrypted payload as JSON: ${err instanceof Error ? err.message : 'Unknown error'}`,
          { eventId: notificationEvent.id },
        );
      }
    } catch (err) {
      throw NotificationError.sendFailed(
        err instanceof Error ? err : new Error('Failed to decrypt payload'),
        { eventId: notificationEvent.id },
      );
    }
  }

  /**
   * Handle processing errors
   * @param error The error that occurred
   * @param messageId The ID of the message that failed
   */
  private handleProcessingError(error: unknown, messageId: string): void {
    const errorMessage =
      error instanceof Error ? error.message : 'Unknown error';
    const errorStack = error instanceof Error ? error.stack : undefined;

    this.logger.error(
      `Failed to process record with ID ${messageId}: ${errorMessage}`,
      errorStack,
    );
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
      this.logger.debug(
        `Processing notification of type ${event.header.event_name}`,
      );
      this.logger.debug(`Notification payload: ${JSON.stringify(payload)}`);

      // Add specific handling for different event types
      switch (event.header.event_name) {
        case NotificationType.APPLICATION_CREATE:
          await this.processSalesforceCaseCreate(event, payload);
          break;
        case NotificationType.APPLICATION_UPDATE:
          await this.processApplicationUpdate(event, payload);
          break;
        default:
          this.logger.warn(
            `Unknown notification type: ${event.header.event_name}`,
          );
      }

      this.logger.debug(
        `Finished processing notification of type ${event.header.event_name}`,
      );
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(
        `Error processing notification of type ${event.header.event_name}: ${errorMessage}`,
        error instanceof Error ? error.stack : undefined,
      );
      throw error;
    }
  }

  /**
   * Process Salesforce case creation notification
   * @param event The notification event
   * @param payload The notification payload
   */
  private async processSalesforceCaseCreate(
    event: NotificationEvent,
    payload: Record<string, unknown>,
  ): Promise<void> {
    this.logger.debug('Processing Salesforce case creation');
    try {
      const enrichedPayload = {
        ...event,
      };

      await this.salesforceEventService.sendNotificationEvent({
        type: event.header.event_name,
        data: JSON.stringify(enrichedPayload),
      });

      this.logger.debug('Successfully sent Salesforce event', { event });
    } catch (error) {
      this.logger.error(
        'Failed to send Salesforce case creation event:',
        error instanceof Error ? error.stack : undefined,
      );
      throw new Error(
        `Failed to process Salesforce case creation: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
    }
  }

  /**
   * Process application update notification
   * @param event The notification event
   * @param payload The notification payload
   */
  private async processApplicationUpdate(
    event: NotificationEvent,
    payload: Record<string, unknown>,
  ): Promise<void> {
    this.logger.debug('Processing application update notification');
    this.logger.debug(`Notification payload: ${JSON.stringify(payload)}`);
    try {
      // if (!payload.applicationId) {
      //   throw NotificationError.invalidEvent(
      //     'Application ID is required for update',
      //     { eventId: event.id },
      //   );
      // }

      // const applicationData = {
      //   applicationId: payload.applicationId,
      //   status: payload.status,
      //   ...payload,
      // };

      const enrichedPayload = {
        // ...applicationData,
        // tenant: event.header.tenant,
        // metadata: {
        //   source: event.payload.activityBy.source,
        //   version: event.header.event_version,
        //   timestamp: new Date().toISOString(),
        //   eventId: event.id,
        // },
        ...event,
      };

      await this.salesforceEventService.sendNotificationEvent({
        type: event.header.event_name,
        data: JSON.stringify(enrichedPayload),
      });

      this.logger.debug('Successfully processed application update', {
        eventId: event.id,
        applicationId: payload.applicationId,
        tenant: event.header.tenant,
      });
    } catch (err) {
      throw NotificationError.sendFailed(
        err instanceof Error
          ? err
          : new Error('Failed to process application update'),
        { eventId: event.id },
      );
    }
  }

  /**
   * Validate Salesforce case payload
   * @param payload The payload to validate
   * @returns Validated case data
   */
  private validateSalesforceCasePayload(
    payload: Record<string, unknown>,
  ): Record<string, unknown> {
    // Required fields validation
    if (!payload.subject) {
      throw new Error('Case subject is required');
    }
    if (!payload.description) {
      throw new Error('Case description is required');
    }

    // Type validation
    if (typeof payload.subject !== 'string') {
      throw new Error('Case subject must be a string');
    }
    if (typeof payload.description !== 'string') {
      throw new Error('Case description must be a string');
    }

    // Extract and validate case data
    const caseData = {
      subject: payload.subject,
      description: payload.description,
      priority: payload.priority || 'Medium',
      status: payload.status || 'New',
      origin: payload.origin || 'Web',
      type: payload.type,
      category: payload.category,
      subcategory: payload.subcategory,
      contactEmail: payload.contactEmail,
      contactPhone: payload.contactPhone,
      accountId: payload.accountId,
      ...payload,
    };

    return caseData;
  }

  /**
   * Validate Salesforce contact payload
   * @param payload The payload to validate
   * @returns Validated contact data
   */
  private validateSalesforceContactPayload(
    payload: Record<string, unknown>,
  ): any {
    if (!payload.email) {
      throw new Error('Contact email is required');
    }
    return payload;
  }

  /**
   * Process user update notification
   * @param event The notification event
   * @param payload The notification payload
   */
  private async processUserUpdate(
    event: NotificationEvent,
    payload: Record<string, unknown>,
  ): Promise<void> {
    this.logger.debug('Processing user update notification');
    // Implement user update logic
  }

  /**
   * Get Salesforce connection options
   * @returns Salesforce connection options
   */
  private getSalesforceConnectionOptions(): SalesforceConnectionOptions {
    if (!process.env.SALESFORCE_LOGIN_URL) {
      throw new Error('SALESFORCE_LOGIN_URL is not configured');
    }
    if (!process.env.SALESFORCE_PRIVATE_KEY) {
      throw new Error('SALESFORCE_PRIVATE_KEY is not configured');
    }
    if (!process.env.SALESFORCE_CLIENT_ID) {
      throw new Error('SALESFORCE_CLIENT_ID is not configured');
    }
    if (!process.env.SALESFORCE_USERNAME) {
      throw new Error('SALESFORCE_USERNAME is not configured');
    }

    return {
      instanceUrl: process.env.SALESFORCE_LOGIN_URL,
      privateKey: process.env.SALESFORCE_PRIVATE_KEY,
      consumerKey: process.env.SALESFORCE_CLIENT_ID,
      username: process.env.SALESFORCE_USERNAME,
    };
  }
}
