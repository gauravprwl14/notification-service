import { NotificationEvent } from './notification-event.interface';

/**
 * Interface for notification provider configuration
 * Each provider can have its own specific configuration
 */
export interface NotificationProviderConfig {
  /**
   * Unique identifier for the provider
   * @example "aws-sns-provider"
   */
  id: string;

  /**
   * Type of the provider
   * @example "sns", "email", "sms"
   */
  type: string;

  /**
   * Display name for the provider
   * @example "AWS SNS Provider"
   */
  name: string;

  /**
   * Whether the provider is enabled
   * @default true
   */
  enabled: boolean;

  /**
   * Provider-specific configuration
   * This can vary based on the provider type
   * @example { "topicArn": "arn:aws:sns:us-east-1:123456789012:my-topic" }
   */
  config: Record<string, unknown>;
}

/**
 * Interface for notification provider
 * All provider implementations must implement this interface
 */
export interface NotificationProvider {
  /**
   * Get the provider type
   * @returns The provider type string
   * @example "sns", "email", "sms"
   */
  getType(): string;

  /**
   * Send a notification event through this provider
   * @param event The notification event to send
   * @param config Provider-specific configuration
   * @returns A promise that resolves to the result of the send operation
   * @throws Error if the send operation fails
   */
  send(
    event: NotificationEvent,
    config: NotificationProviderConfig,
  ): Promise<NotificationSendResult>;
}

/**
 * Interface for notification send result
 */
export interface NotificationSendResult {
  /**
   * Whether the send operation was successful
   */
  success: boolean;

  /**
   * Provider-specific message ID or reference
   * @example "1234567890abcdef"
   */
  messageId?: string;

  /**
   * Error message if the send operation failed
   */
  error?: string;

  /**
   * Timestamp when the notification was sent (ISO format)
   * @example "2023-01-01T12:00:00Z"
   */
  timestamp: string;

  /**
   * Provider-specific response data
   */
  providerResponse?: Record<string, unknown>;
}
