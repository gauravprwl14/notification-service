import { Injectable, Logger } from '@nestjs/common';
import { SNS } from '@aws-sdk/client-sns';
import {
  INotificationProvider,
  NotificationMessage,
  NotificationProviderConfig,
  NotificationResult,
} from '../interfaces/notification-provider.interface';

/**
 * AWS SNS provider configuration interface
 */
export interface AwsSnsConfig extends NotificationProviderConfig {
  /**
   * AWS region
   */
  region: string;

  /**
   * Optional AWS endpoint (for local development)
   */
  endpoint?: string;

  /**
   * Optional AWS credentials
   */
  credentials?: {
    accessKeyId: string;
    secretAccessKey: string;
  };
}

/**
 * AWS SNS notification provider implementation
 */
@Injectable()
export class AwsSnsProvider implements INotificationProvider {
  private readonly logger = new Logger(AwsSnsProvider.name);
  private sns: SNS | null = null;

  /**
   * Initialize the SNS client with configuration
   * @param config AWS SNS configuration
   */
  async initialize(config: AwsSnsConfig): Promise<void> {
    try {
      this.sns = new SNS({
        region: config.region,
        endpoint: config.endpoint,
        credentials: config.credentials,
      });

      this.logger.log(
        `AWS SNS provider initialized in region ${config.region}`,
      );
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(
        `Failed to initialize AWS SNS provider: ${errorMessage}`,
      );
      throw error;
    }
  }

  /**
   * Send a message to SNS topic
   * @param message The notification message
   * @returns Promise resolving to the notification result
   */
  async send(message: NotificationMessage): Promise<NotificationResult> {
    if (!this.sns) {
      throw new Error('AWS SNS provider not initialized');
    }

    try {
      const result = await this.sns.publish({
        TopicArn: message.target,
        Message: message.message,
        MessageAttributes: message.attributes,
      });

      return {
        messageId: result.MessageId || 'unknown',
        timestamp: new Date().toISOString(),
        success: true,
        metadata: {
          sequenceNumber: result.SequenceNumber,
        },
      };
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(`Failed to send SNS message: ${errorMessage}`);
      throw error;
    }
  }

  /**
   * Get the provider name
   * @returns The name of the provider
   */
  getProviderName(): string {
    return 'AWS-SNS';
  }
}
