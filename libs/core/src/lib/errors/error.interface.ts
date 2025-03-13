/**
 * Types of errors in the system
 */
export enum ErrorType {
  BUSINESS = 'BUSINESS',
  SYSTEM = 'SYSTEM',
  VALIDATION = 'VALIDATION',
  BUSINESS_LOGIC = 'BUSINESS_LOGIC',
  TECHNICAL = 'TECHNICAL',
}

/**
 * Categories of errors for grouping
 */
export enum ErrorCategory {
  NOTIFICATION = 'NOTIFICATION',
  AUTHENTICATION = 'AUTHENTICATION',
  AUTHORIZATION = 'AUTHORIZATION',
  VALIDATION = 'VALIDATION',
  SYSTEM = 'SYSTEM',
  CLIENT = 'CLIENT',
  SERVER = 'SERVER',
}

/**
 * Error data interface
 */
export interface ErrorData {
  [key: string]: unknown;
}

/**
 * Interface for application errors
 */
export interface ApplicationError {
  errorCode: string;
  message: string;
  errorType: ErrorType;
  errorCategory: ErrorCategory;
  messageKey: string;
  data?: Record<string, unknown>;
}

/**
 * Error response interface
 */
export interface ErrorResponse {
  errors: ApplicationError[];
}
