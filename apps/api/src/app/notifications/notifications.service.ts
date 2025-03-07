import { Injectable, Logger, Inject } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  SnsProviderAdapter,
  SqsProviderAdapter,
} from '@notification-service/provider-adapters';
import {
  NotificationEvent,
  NotificationProviderConfig,
  NotificationSendResult,
  EncryptionService,
  ProviderType,
} from '@notification-service/core';
import { CreateNotificationDto } from './dto';

/**
 * Service for handling notifications
 */
@Injectable()
export class NotificationsService {
  private readonly logger = new Logger(NotificationsService.name);

  /**
   * Constructor for NotificationsService
   * @param snsProvider SNS provider adapter
   * @param sqsProvider SQS provider adapter
   * @param encryptionService Encryption service
   * @param configService Config service for retrieving environment variables
   */
  constructor(
    private readonly snsProvider: SnsProviderAdapter,
    private readonly sqsProvider: SqsProviderAdapter,
    @Inject('ENCRYPTION_SERVICE')
    private readonly encryptionService: EncryptionService,
    private readonly configService: ConfigService,
  ) {}

  /**
   * Create a new notification
   * @param createNotificationDto DTO containing notification data
   * @returns A promise that resolves to the result of the notification send operation
   * @example
   * const result = await notificationsService.create({
   *   id: '550e8400-e29b-41d4-a716-446655440000',
   *   type: 'transaction.completed',
   *   version: '1.0',
   *   timestamp: '2023-01-01T12:00:00Z',
   *   source: 'mobile-banking-app',
   *   tenant: {
   *     financialInstitutionId: 'acme-bank',
   *     appId: 'mobile-banking',
   *     environment: 'production',
   *   },
   *   encryptedPayload: 'AQICAHiWpC0eMDGjJJ4...',
   * });
   */
  async create(
    createNotificationDto: CreateNotificationDto,
  ): Promise<NotificationSendResult> {
    this.logger.debug(
      `Creating notification with ID ${createNotificationDto.id}`,
    );

    // Convert DTO to notification event
    const event: NotificationEvent = {
      ...createNotificationDto,
    };

    // Get the SNS topic ARN from environment variables
    const topicArn = this.configService.get<string>('SNS_TOPIC_ARN');

    if (!topicArn) {
      throw new Error('Missing SNS_TOPIC_ARN environment variable');
    }

    // For now, we'll use SNS as the default provider
    // In a real implementation, we would look up the provider based on tenant configuration
    const providerConfig: NotificationProviderConfig = {
      id: 'aws-sns-provider',
      type: ProviderType.SNS,
      name: 'AWS SNS Provider',
      enabled: true,
      config: {
        topicArn,
      },
    };

    // Send the notification using the appropriate provider
    let result: NotificationSendResult;
    if (providerConfig.type === ProviderType.SNS) {
      result = await this.snsProvider.send(event, providerConfig);
    } else if (providerConfig.type === ProviderType.SQS) {
      result = await this.sqsProvider.send(event, providerConfig);
    } else {
      throw new Error(`Unsupported provider type: ${providerConfig.type}`);
    }

    this.logger.debug(
      `Notification ${event.id} created with result: ${result.success}`,
    );
    return result;
  }
}
