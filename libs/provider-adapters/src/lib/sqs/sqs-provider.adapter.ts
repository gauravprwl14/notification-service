import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  SQSClient,
  SendMessageCommand,
  ListQueuesCommand,
} from '@aws-sdk/client-sqs';
import {
  NotificationEvent,
  NotificationProvider,
  NotificationProviderConfig,
  NotificationSendResult,
  ProviderType,
  retryConnection,
  ProviderError,
} from '@notification-service/core';

/**
 * SQS provider adapter for sending notifications via AWS SQS
 */
@Injectable()
export class SqsProviderAdapter implements NotificationProvider, OnModuleInit {
  private readonly logger = new Logger(SqsProviderAdapter.name);
  private sqsClient: SQSClient;

  /**
   * Constructor for SqsProviderAdapter
   * @param configService NestJS config service for retrieving AWS configuration
   */
  constructor(private readonly configService: ConfigService) {
    // Get AWS configuration from environment variables
    const region = this.configService.get<string>('AWS_REGION');
    const endpoint = this.configService.get<string>('AWS_ENDPOINT');
    const accessKeyId = this.configService.get<string>('AWS_ACCESS_KEY_ID');
    const secretAccessKey = this.configService.get<string>(
      'AWS_SECRET_ACCESS_KEY',
    );

    // Validate required credentials
    if (!region || !accessKeyId || !secretAccessKey) {
      this.logger.error(
        'Missing AWS credentials. Please check your environment variables.',
      );
    }

    // Initialize the SQS client with configuration from environment variables
    this.sqsClient = new SQSClient({
      region,
      endpoint,
      credentials: {
        accessKeyId: accessKeyId || 'dummy',
        secretAccessKey: secretAccessKey || 'dummy',
      },
      // Add retry configuration
      maxAttempts: 5,
    });
  }

  /**
   * Initialize the provider and verify connection
   */
  async onModuleInit(): Promise<void> {
    try {
      // Test the connection by listing queues
      await retryConnection(
        async () => {
          const command = new ListQueuesCommand({});
          await this.sqsClient.send(command);
          this.logger.log('Successfully connected to AWS SQS');
          return true;
        },
        {
          maxRetries: 5,
          initialDelay: 2000,
          maxDelay: 10000,
          logger: this.logger,
          serviceName: 'AWS SQS',
        },
      );
    } catch (error) {
      this.logger.error(
        'Failed to connect to AWS SQS. Notifications via SQS will not work.',
        error instanceof Error ? error.stack : undefined,
      );
    }
  }

  /**
   * Get the provider type
   * @returns The provider type string
   */
  getType(): string {
    return ProviderType.SQS;
  }

  /**
   * Send a notification event through SQS
   * @param event The notification event to send
   * @param config Provider-specific configuration
   * @returns A promise that resolves to the result of the send operation
   * @throws Error if the send operation fails
   * @example
   * const result = await sqsProvider.send(
   *   notificationEvent,
   *   {
   *     id: 'aws-sqs-provider',
   *     type: 'sqs',
   *     name: 'AWS SQS Provider',
   *     enabled: true,
   *     config: {
   *       queueUrl: 'https://sqs.us-east-1.amazonaws.com/123456789012/my-queue'
   *     }
   *   }
   * );
   */
  async send(
    event: NotificationEvent,
    config: NotificationProviderConfig,
  ): Promise<NotificationSendResult> {
    try {
      this.logger.debug(`Sending notification event ${event.id} via SQS`);

      // Get the queue URL from the provider configuration or environment variable
      const configQueueUrl = config.config['queueUrl'] as string | undefined;
      const envQueueUrl = this.configService.get<string>('SQS_QUEUE_URL');
      const queueUrl = configQueueUrl || envQueueUrl;

      if (!queueUrl) {
        throw ProviderError.configMissing('queueUrl', 'AWS SQS');
      }

      // Create the message attributes
      const messageAttributes = {
        eventId: {
          DataType: 'String',
          StringValue: event.id,
        },
        eventType: {
          DataType: 'String',
          StringValue: event.header.event_name,
        },
        eventVersion: {
          DataType: 'String',
          StringValue: event.header.event_version,
        },
        source: {
          DataType: 'String',
          StringValue: event.payload.activityBy.source,
        },
        financialInstitutionId: {
          DataType: 'String',
          StringValue: event.header.tenant.financialInstitutionId,
        },
        appId: {
          DataType: 'String',
          StringValue: event.header.tenant.appId,
        },
        environment: {
          DataType: 'String',
          StringValue: event.header.tenant.environment,
        },
      };

      // Create the send message command
      const command = new SendMessageCommand({
        QueueUrl: queueUrl,
        MessageBody: JSON.stringify(event),
        MessageAttributes: messageAttributes,
      });

      // Execute the command with retry
      const response = await retryConnection(
        async () => this.sqsClient.send(command),
        {
          maxRetries: 3,
          initialDelay: 1000,
          logger: this.logger,
          serviceName: 'AWS SQS Send',
        },
      );

      this.logger.debug(
        `Successfully sent notification event ${event.id} via SQS`,
      );

      // Return the result
      return {
        success: true,
        messageId: response.MessageId,
        timestamp: new Date().toISOString(),
        providerResponse: {
          messageId: response.MessageId,
          sequenceNumber: response.SequenceNumber,
          md5OfMessageBody: response.MD5OfMessageBody,
        },
      };
    } catch (error) {
      this.logger.error(
        `Failed to send notification event ${event.id} via SQS`,
        error instanceof Error ? error.stack : undefined,
      );

      throw ProviderError.operationFailed(
        'publish',
        'AWS SQS',
        error instanceof Error ? error : undefined,
      );
    }
  }
}
