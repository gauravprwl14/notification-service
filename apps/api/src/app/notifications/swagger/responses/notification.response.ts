import { SchemaObject } from '@nestjs/swagger/dist/interfaces/open-api-spec.interface';

/**
 * Swagger schema for successful notification response
 */
export const notificationSuccessResponseSchema: SchemaObject = {
  type: 'object',
  required: ['success', 'messageId', 'timestamp'],
  properties: {
    success: {
      type: 'boolean',
      description: 'Indicates if the notification was accepted',
      example: true,
    },
    messageId: {
      type: 'string',
      description: 'The unique identifier assigned by the messaging system',
      example: 'msg-123e4567-e89b-12d3-a456-426614174000',
    },
    timestamp: {
      type: 'string',
      format: 'date-time',
      description: 'The timestamp when the notification was processed',
      example: new Date().toISOString(),
    },
  },
};

/**
 * Swagger schema for error response
 */
export const notificationErrorResponseSchema: SchemaObject = {
  type: 'object',
  required: ['errors'],
  properties: {
    errors: {
      type: 'array',
      items: {
        type: 'object',
        required: [
          'errorCode',
          'message',
          'errorType',
          'errorCategory',
          'messageKey',
        ],
        properties: {
          errorCode: {
            type: 'string',
            description: 'Unique error code',
            example: 'NOTIFICATION_004',
          },
          message: {
            type: 'string',
            description: 'Human-readable error message',
            example:
              'Invalid event structure: missing required field header.event_name',
          },
          errorType: {
            type: 'string',
            description: 'Type of error',
            example: 'VALIDATION',
          },
          errorCategory: {
            type: 'string',
            description: 'Category of error',
            example: 'CLIENT',
          },
          messageKey: {
            type: 'string',
            description: 'Key for internationalization',
            example: 'error.notification.invalid_event',
          },
          data: {
            type: 'object',
            description: 'Additional error context',
            additionalProperties: true,
            nullable: true,
          },
        },
      },
    },
  },
};

/**
 * Swagger schema for unauthorized response
 */
export const unauthorizedResponseSchema: SchemaObject = {
  type: 'object',
  required: ['statusCode', 'message', 'error'],
  properties: {
    statusCode: {
      type: 'number',
      description: 'HTTP status code',
      example: 401,
    },
    message: {
      type: 'string',
      description: 'Error message',
      example: 'Unauthorized',
    },
    error: {
      type: 'string',
      description: 'Error description',
      example: 'Missing or invalid API key',
    },
  },
};
