import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NotificationEvent, EventName } from '@notification-service/core';
import { SnsProviderAdapter } from '@notification-service/provider-adapters';
import { NotificationError } from '@notification-service/core';

/**
 * Interface for notification processing result
 */
interface NotificationResponse {
  success: boolean;
  messageId?: string;
  timestamp: string;
}

/**
 * Service for handling notifications
 */
@Injectable()
export class NotificationsService {
  private readonly logger = new Logger(NotificationsService.name);

  constructor(
    private readonly snsProvider: SnsProviderAdapter,
    private readonly configService: ConfigService,
  ) {}

  /**
   * Process a notification event
   * @param event The notification event to process
   * @returns The result of the notification processing
   */
  async processEvent(
    event: NotificationEvent<Record<string, unknown>>,
  ): Promise<NotificationResponse> {
    this.logger.debug(
      `Processing notification event: ${JSON.stringify(event, null, 2)}`,
    );

    try {
      // Map event name to SNS topic
      const topicArn = this.getTopicArnForEvent(event.header.event_name);

      // Send message using SNS provider
      const result = await this.snsProvider.send(event, {
        id: 'aws-sns-provider',
        type: 'sns',
        name: 'AWS SNS Provider',
        enabled: true,
        config: {
          topicArn,
        },
      });

      return {
        success: result.success,
        messageId: result.messageId,
        timestamp: result.timestamp,
      };
    } catch (error) {
      this.logger.error(
        'Failed to process notification event',
        error instanceof Error ? error.stack : undefined,
      );
      throw NotificationError.sendFailed(
        error instanceof Error ? error : new Error('Unknown error'),
        { eventId: event.header.event_name },
      );
    }
  }

  /**
   * Get SNS topic ARN for event type
   * @param eventName The event name
   * @returns The SNS topic ARN
   * @private
   */
  private getTopicArnForEvent(eventName: string): string {
    // Map event names to topic ARNs
    const topicMap: Record<string, string> = {
      [EventName.APPLICATION_UPDATE]: this.configService.getOrThrow<string>(
        'SNS_TOPIC_APPLICATION_UPDATE',
      ),
      [EventName.APPLICATION_CREATE]: this.configService.getOrThrow<string>(
        'SNS_TOPIC_APPLICATION_CREATE',
      ),
      [EventName.USER_UPDATE]: this.configService.getOrThrow<string>(
        'SNS_TOPIC_USER_UPDATE',
      ),
    };

    const topicArn = topicMap[eventName];
    if (!topicArn) {
      throw NotificationError.topicNotConfigured(eventName);
    }

    return topicArn;
  }
}
