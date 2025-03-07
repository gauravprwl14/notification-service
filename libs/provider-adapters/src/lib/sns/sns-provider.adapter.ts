import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  SNSClient,
  PublishCommand,
  ListTopicsCommand,
} from '@aws-sdk/client-sns';
import {
  NotificationEvent,
  NotificationProvider,
  NotificationProviderConfig,
  NotificationSendResult,
  ProviderType,
  retryConnection,
} from '@notification-service/core';

/**
 * SNS provider adapter for sending notifications via AWS SNS
 */
@Injectable()
export class SnsProviderAdapter implements NotificationProvider, OnModuleInit {
  private readonly logger = new Logger(SnsProviderAdapter.name);
  private snsClient: SNSClient;

  /**
   * Constructor for SnsProviderAdapter
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

    // Initialize the SNS client with configuration from environment variables
    this.snsClient = new SNSClient({
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
      // Test the connection by listing topics
      await retryConnection(
        async () => {
          const command = new ListTopicsCommand({});
          await this.snsClient.send(command);
          this.logger.log('Successfully connected to AWS SNS');
          return true;
        },
        {
          maxRetries: 5,
          initialDelay: 2000,
          maxDelay: 10000,
          logger: this.logger,
          serviceName: 'AWS SNS',
        },
      );
    } catch (error) {
      this.logger.error(
        'Failed to connect to AWS SNS. Notifications via SNS will not work.',
        error instanceof Error ? error.stack : undefined,
      );
    }
  }

  /**
   * Get the provider type
   * @returns The provider type string
   */
  getType(): string {
    return ProviderType.SNS;
  }

  /**
   * Send a notification event through SNS
   * @param event The notification event to send
   * @param config Provider-specific configuration
   * @returns A promise that resolves to the result of the send operation
   * @throws Error if the send operation fails
   * @example
   * const result = await snsProvider.send(
   *   notificationEvent,
   *   {
   *     id: 'aws-sns-provider',
   *     type: 'sns',
   *     name: 'AWS SNS Provider',
   *     enabled: true,
   *     config: {
   *       topicArn: 'arn:aws:sns:us-east-1:123456789012:my-topic'
   *     }
   *   }
   * );
   */
  async send(
    event: NotificationEvent,
    config: NotificationProviderConfig,
  ): Promise<NotificationSendResult> {
    try {
      this.logger.debug(`Sending notification event ${event.id} via SNS`);

      this.logger.debug('Event Payload:', event);
      // Get the topic ARN from the provider configuration or environment variable
      const configTopicArn = config.config['topicArn'] as string | undefined;
      const envTopicArn = this.configService.get<string>('SNS_TOPIC_ARN');
      const topicArn = configTopicArn || envTopicArn;

      if (!topicArn) {
        throw new Error(
          'Missing topicArn in provider configuration and SNS_TOPIC_ARN environment variable',
        );
      }

      // Check if this is a FIFO topic
      const isFifoTopic = topicArn.endsWith('.fifo');

      // Create the message attributes
      const messageAttributes = {
        eventId: {
          DataType: 'String',
          StringValue: event.id,
        },
        eventType: {
          DataType: 'String',
          StringValue: event.type,
        },
        eventVersion: {
          DataType: 'String',
          StringValue: event.version,
        },
        source: {
          DataType: 'String',
          StringValue: event.source,
        },
        financialInstitutionId: {
          DataType: 'String',
          StringValue: event.tenant.financialInstitutionId,
        },
        appId: {
          DataType: 'String',
          StringValue: event.tenant.appId,
        },
        environment: {
          DataType: 'String',
          StringValue: event.tenant.environment,
        },
      };

      // Create the publish command with FIFO-specific parameters if needed
      const command = new PublishCommand({
        TopicArn: topicArn,
        Message: JSON.stringify(event),
        MessageAttributes: messageAttributes,
        ...(isFifoTopic && {
          // For FIFO topics, use a combination of tenant and event info as the group ID
          MessageGroupId: `${event.tenant.financialInstitutionId}-${event.tenant.appId}-${event.type}`,
          // Use event ID as deduplication ID to ensure exactly-once delivery
          MessageDeduplicationId: event.id,
        }),
      });

      // Execute the command with retry
      const response = await retryConnection(
        async () => this.snsClient.send(command),
        {
          maxRetries: 3,
          initialDelay: 1000,
          logger: this.logger,
          serviceName: 'AWS SNS Publish',
        },
      );

      this.logger.debug(
        `Successfully sent notification event ${event.id} via SNS`,
      );

      // Return the result
      return {
        success: true,
        messageId: response.MessageId,
        timestamp: new Date().toISOString(),
        providerResponse: {
          messageId: response.MessageId,
          sequenceNumber: response.SequenceNumber,
        },
      };
    } catch (error) {
      // Type guard for error object
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';
      const errorStack = error instanceof Error ? error.stack : undefined;

      this.logger.error(
        `Failed to send notification event ${event.id} via SNS: ${errorMessage}`,
        errorStack,
      );

      // Return the error result
      return {
        success: false,
        error: errorMessage,
        timestamp: new Date().toISOString(),
      };
    }
  }
}
