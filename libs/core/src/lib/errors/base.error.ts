import { ErrorCategory, ErrorType } from './error.interface';

/**
 * Base error class for standardized error handling across the application
 */
export class BaseError extends Error {
  /**
   * Error code for categorization and tracking
   */
  readonly errorCode: string;

  /**
   * Type of error (e.g., Validation, System, Business)
   */
  readonly errorType: ErrorType;

  /**
   * Category of error for grouping
   */
  readonly errorCategory: ErrorCategory;

  /**
   * Message key for i18n support
   */
  readonly messageKey: string;

  /**
   * Additional error context data
   */
  readonly data?: Record<string, unknown>;

  /**
   * Original error if this error wraps another error
   */
  readonly originalError?: Error;

  /**
   * Timestamp when the error occurred
   */
  readonly timestamp: string;

  /**
   * Request ID for tracing (if available)
   */
  readonly requestId?: string;

  constructor(params: {
    message: string;
    errorCode: string;
    errorType: ErrorType;
    errorCategory: ErrorCategory;
    messageKey: string;
    data?: Record<string, unknown>;
    originalError?: Error;
    requestId?: string;
  }) {
    super(params.message);
    this.name = this.constructor.name;
    this.errorCode = params.errorCode;
    this.errorType = params.errorType;
    this.errorCategory = params.errorCategory;
    this.messageKey = params.messageKey;
    this.data = params.data;
    this.originalError = params.originalError;
    this.timestamp = new Date().toISOString();
    this.requestId = params.requestId;

    // Ensure proper stack trace
    Error.captureStackTrace(this, this.constructor);

    // Placeholder for future observability integration
    this.reportError();
  }

  /**
   * Convert error to JSON format
   */
  toJSON() {
    return {
      name: this.name,
      errorCode: this.errorCode,
      message: this.message,
      errorType: this.errorType,
      errorCategory: this.errorCategory,
      messageKey: this.messageKey,
      data: this.data,
      timestamp: this.timestamp,
      requestId: this.requestId,
      stack: this.stack,
      originalError: this.originalError
        ? {
            name: this.originalError.name,
            message: this.originalError.message,
            stack: this.originalError.stack,
          }
        : undefined,
    };
  }

  /**
   * Placeholder for error reporting/observability integration
   * @private
   */
  private reportError(): void {
    // TODO: Integrate with observability platform
    // Example integrations:
    // - Error tracking (e.g., Sentry)
    // - Logging (e.g., CloudWatch, ELK)
    // - Metrics (e.g., Prometheus)
    // - Tracing (e.g., X-Ray, Jaeger)
  }
}
