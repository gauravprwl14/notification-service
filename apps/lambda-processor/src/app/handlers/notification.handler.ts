import { Injectable, Logger, Inject } from '@nestjs/common';
import { SQSEvent, SQSRecord } from 'aws-lambda';
import {
  NotificationEvent,
  EncryptionService,
  EncryptionContext,
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
    } catch (error) {
      throw new Error(
        `Failed to parse SNS message envelope as JSON: ${error.message}`,
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
    try {
      const notificationEvent = JSON.parse(snsMessage.Message);
      this.logger.debug(
        'Parsed notification event:',
        JSON.stringify(notificationEvent, null, 2),
      );
      return notificationEvent;
    } catch (error) {
      throw new Error(
        `Failed to parse SNS Message content as JSON: ${error.message}`,
      );
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

    // If encryption is disabled, try to parse as JSON directly
    if (!tenantConfig.features.encryption.enabled) {
      try {
        this.logger.debug(
          'Encryption disabled, parsing payload as JSON directly',
        );
        // return JSON.parse(notificationEvent.encryptedPayload);
        return { data: notificationEvent.encryptedPayload };
      } catch (error) {
        this.logger.error('Failed to parse payload as JSON:', error);
        throw new Error(
          `Failed to parse payload as JSON: ${error.message}. Note: Encryption is disabled, expecting plain JSON payload.`,
        );
      }
    }

    // If encryption is enabled, decrypt and parse
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
    const encryptionContext: EncryptionContext = {
      financialInstitutionId: notificationEvent.tenant.financialInstitutionId,
      appId: notificationEvent.tenant.appId,
      environment: notificationEvent.tenant.environment,
    };

    try {
      this.logger.debug('Attempting to decrypt payload...');
      const decryptedPayload = await this.encryptionService.decrypt(
        notificationEvent.encryptedPayload,
        encryptionContext,
      );
      this.logger.debug('Payload decrypted successfully');

      try {
        const parsedPayload = JSON.parse(decryptedPayload);
        this.logger.debug('Payload parsed successfully');
        return parsedPayload;
      } catch (error) {
        throw new Error(
          `Failed to parse decrypted payload as JSON: ${error.message}`,
        );
      }
    } catch (error) {
      this.logger.error('Failed to decrypt payload:', error);
      throw new Error(
        `Failed to decrypt payload: ${error instanceof Error ? error.message : 'Unknown error'}`,
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
      this.logger.debug(`Processing notification of type ${event.type}`);
      this.logger.debug(`Notification payload: ${JSON.stringify(payload)}`);

      // Add specific handling for different event types
      switch (event.type) {
        case NotificationType.APPLICATION_CREATE:
          await this.processSalesforceCaseCreate(event, payload);
          break;
        case NotificationType.APPLICATION_UPDATE:
          await this.processSalesforceCaseCreate(event, payload);
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
      // Validate the case payload before processing
      // const caseData = this.validateSalesforceCasePayload(payload);

      // Enrich the payload with additional metadata
      const enrichedPayload = {
        // tenant: event.tenant,
        // metadata: {
        //   source: event.source,
        //   version: event.version,
        //   timestamp: new Date().toISOString(),
        //   eventId: event.id,
        // },
        ...event,
      };

      // Send the notification event to Salesforce
      await this.salesforceEventService.sendNotificationEvent({
        type: event.type,
        data: JSON.stringify(enrichedPayload),
      });

      this.logger.debug('Successfully sent Salesforce event', {
        // eventId: event.id,
        // type: event.type,
        // tenant: event.tenant,
        // payload: event.encryptedPayload,
        event,
      });
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
    try {
      // Validate required fields for application update
      if (!payload.applicationId) {
        throw new Error('Application ID is required for update');
      }

      // Extract application data
      const applicationData = {
        applicationId: payload.applicationId,
        status: payload.status,
        updatedFields: payload.updatedFields || {},
        updateReason: payload.updateReason,
        updatedBy: payload.updatedBy,
        ...payload,
      };

      // Enrich the payload with tenant and metadata
      const enrichedPayload = {
        ...applicationData,
        tenant: event.tenant,
        metadata: {
          source: event.source,
          version: event.version,
          timestamp: new Date().toISOString(),
          eventId: event.id,
        },
      };

      // Send the notification event to Salesforce
      await this.salesforceEventService.sendNotificationEvent({
        type: event.type,
        data: JSON.stringify(enrichedPayload),
      });

      this.logger.debug('Successfully processed application update', {
        eventId: event.id,
        applicationId: payload.applicationId,
        tenant: event.tenant,
      });
    } catch (error) {
      this.logger.error(
        'Failed to process application update:',
        error instanceof Error ? error.stack : undefined,
      );
      throw new Error(
        `Failed to process application update: ${error instanceof Error ? error.message : 'Unknown error'}`,
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
