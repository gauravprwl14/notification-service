/**
 * Interface for notification message attributes
 */
export interface NotificationMessageAttributes {
  [key: string]: {
    DataType: string;
    StringValue: string;
  };
}

/**
 * Interface for notification message
 */
export interface NotificationMessage {
  /**
   * Target identifier (e.g., topic ARN, queue URL)
   */
  target: string;

  /**
   * Message content
   */
  message: string;

  /**
   * Optional message attributes
   */
  attributes?: NotificationMessageAttributes;
}

/**
 * Interface for notification result
 */
export interface NotificationResult {
  /**
   * Unique identifier for the sent message
   */
  messageId: string;

  /**
   * Timestamp when the message was sent
   */
  timestamp: string;

  /**
   * Whether the operation was successful
   */
  success: boolean;

  /**
   * Optional provider-specific metadata
   */
  metadata?: Record<string, unknown>;
}

/**
 * Interface for notification provider configuration
 */
export interface NotificationProviderConfig {
  /**
   * Provider-specific configuration options
   */
  [key: string]: unknown;
}

/**
 * Interface defining the contract for notification providers
 */
export interface INotificationProvider {
  /**
   * Initialize the provider with configuration
   * @param config Provider-specific configuration
   */
  initialize(config: NotificationProviderConfig): Promise<void>;

  /**
   * Send a notification message
   * @param message The notification message to send
   * @returns Promise resolving to the notification result
   */
  send(message: NotificationMessage): Promise<NotificationResult>;

  /**
   * Get the provider name
   * @returns The name of the provider
   */
  getProviderName(): string;
}
