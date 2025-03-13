import { ApplicationError, ErrorType, ErrorCategory } from './error.interface';

/**
 * Error codes enum
 */
export enum ErrorCode {
  // Validation errors (NOT prefix)
  INVALID_EVENT_STRUCTURE = 'NOT1001',
  INVALID_EVENT_HEADER = 'NOT1002',
  INVALID_EVENT_PAYLOAD = 'NOT1003',
  UNSUPPORTED_EVENT_TYPE = 'NOT1004',

  // Business logic errors
  EVENT_PROCESSING_FAILED = 'NOT2001',
  EVENT_VALIDATION_FAILED = 'NOT2002',
  EVENT_TRANSFORMATION_FAILED = 'NOT2003',

  // Technical errors
  INTERNAL_SERVER_ERROR = 'NOT5001',
  DATABASE_ERROR = 'NOT5002',
  EXTERNAL_SERVICE_ERROR = 'NOT5003',
}

/**
 * Predefined application errors
 */
export const ApplicationErrors: Record<ErrorCode, ApplicationError> = {
  [ErrorCode.INVALID_EVENT_STRUCTURE]: {
    errorCode: ErrorCode.INVALID_EVENT_STRUCTURE,
    message: 'Invalid event structure',
    errorType: ErrorType.VALIDATION,
    errorCategory: ErrorCategory.CLIENT,
    messageKey: 'error.validation.NOT1001.invalidEventStructure',
  },
  [ErrorCode.INVALID_EVENT_HEADER]: {
    errorCode: ErrorCode.INVALID_EVENT_HEADER,
    message: 'Invalid event header',
    errorType: ErrorType.VALIDATION,
    errorCategory: ErrorCategory.CLIENT,
    messageKey: 'error.validation.NOT1002.invalidEventHeader',
  },
  [ErrorCode.INVALID_EVENT_PAYLOAD]: {
    errorCode: ErrorCode.INVALID_EVENT_PAYLOAD,
    message: 'Invalid event payload',
    errorType: ErrorType.VALIDATION,
    errorCategory: ErrorCategory.CLIENT,
    messageKey: 'error.validation.NOT1003.invalidEventPayload',
  },
  [ErrorCode.UNSUPPORTED_EVENT_TYPE]: {
    errorCode: ErrorCode.UNSUPPORTED_EVENT_TYPE,
    message: 'Unsupported event type',
    errorType: ErrorType.VALIDATION,
    errorCategory: ErrorCategory.CLIENT,
    messageKey: 'error.validation.NOT1004.unsupportedEventType',
  },
  [ErrorCode.EVENT_PROCESSING_FAILED]: {
    errorCode: ErrorCode.EVENT_PROCESSING_FAILED,
    message: 'Failed to process event',
    errorType: ErrorType.BUSINESS_LOGIC,
    errorCategory: ErrorCategory.SERVER,
    messageKey: 'error.businessLogic.NOT2001.eventProcessingFailed',
  },
  [ErrorCode.EVENT_VALIDATION_FAILED]: {
    errorCode: ErrorCode.EVENT_VALIDATION_FAILED,
    message: 'Event validation failed',
    errorType: ErrorType.BUSINESS_LOGIC,
    errorCategory: ErrorCategory.SERVER,
    messageKey: 'error.businessLogic.NOT2002.eventValidationFailed',
  },
  [ErrorCode.EVENT_TRANSFORMATION_FAILED]: {
    errorCode: ErrorCode.EVENT_TRANSFORMATION_FAILED,
    message: 'Event transformation failed',
    errorType: ErrorType.BUSINESS_LOGIC,
    errorCategory: ErrorCategory.SERVER,
    messageKey: 'error.businessLogic.NOT2003.eventTransformationFailed',
  },
  [ErrorCode.INTERNAL_SERVER_ERROR]: {
    errorCode: ErrorCode.INTERNAL_SERVER_ERROR,
    message: 'Internal server error',
    errorType: ErrorType.TECHNICAL,
    errorCategory: ErrorCategory.SERVER,
    messageKey: 'error.technical.NOT5001.internalServerError',
  },
  [ErrorCode.DATABASE_ERROR]: {
    errorCode: ErrorCode.DATABASE_ERROR,
    message: 'Database error',
    errorType: ErrorType.TECHNICAL,
    errorCategory: ErrorCategory.SERVER,
    messageKey: 'error.technical.NOT5002.databaseError',
  },
  [ErrorCode.EXTERNAL_SERVICE_ERROR]: {
    errorCode: ErrorCode.EXTERNAL_SERVICE_ERROR,
    message: 'External service error',
    errorType: ErrorType.TECHNICAL,
    errorCategory: ErrorCategory.SERVER,
    messageKey: 'error.technical.NOT5003.externalServiceError',
  },
};
