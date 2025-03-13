import { BaseError } from './base.error';
import { ErrorCategory, ErrorType } from './error.interface';

/**
 * Error codes for notification-related errors
 */
export enum NotificationErrorCode {
  TOPIC_NOT_CONFIGURED = 'NOTIFICATION_001',
  PROVIDER_NOT_INITIALIZED = 'NOTIFICATION_002',
  SEND_FAILED = 'NOTIFICATION_003',
  INVALID_EVENT = 'NOTIFICATION_004',
}

/**
 * Notification-specific error class
 */
export class NotificationError extends BaseError {
  constructor(params: {
    message: string;
    errorCode: NotificationErrorCode;
    data?: Record<string, unknown>;
    originalError?: Error;
    requestId?: string;
  }) {
    super({
      ...params,
      errorType: ErrorType.BUSINESS,
      errorCategory: ErrorCategory.NOTIFICATION,
      messageKey: `error.notification.${params.errorCode.toLowerCase()}`,
    });
  }

  /**
   * Create an error for missing topic configuration
   */
  static topicNotConfigured(
    eventName: string,
    requestId?: string,
  ): NotificationError {
    return new NotificationError({
      message: `No topic configured for event type: ${eventName}`,
      errorCode: NotificationErrorCode.TOPIC_NOT_CONFIGURED,
      data: { eventName },
      requestId,
    });
  }

  /**
   * Create an error for provider initialization failure
   */
  static providerNotInitialized(
    providerName: string,
    originalError?: Error,
    requestId?: string,
  ): NotificationError {
    return new NotificationError({
      message: `Provider not initialized: ${providerName}`,
      errorCode: NotificationErrorCode.PROVIDER_NOT_INITIALIZED,
      data: { providerName },
      originalError,
      requestId,
    });
  }

  /**
   * Create an error for notification send failure
   */
  static sendFailed(
    error: Error,
    context?: Record<string, unknown>,
    requestId?: string,
  ): NotificationError {
    return new NotificationError({
      message: `Failed to send notification: ${error.message}`,
      errorCode: NotificationErrorCode.SEND_FAILED,
      data: { context },
      originalError: error,
      requestId,
    });
  }

  /**
   * Create an error for invalid event
   */
  static invalidEvent(
    details: string,
    data?: Record<string, unknown>,
    requestId?: string,
  ): NotificationError {
    return new NotificationError({
      message: `Invalid notification event: ${details}`,
      errorCode: NotificationErrorCode.INVALID_EVENT,
      data,
      requestId,
    });
  }
}
