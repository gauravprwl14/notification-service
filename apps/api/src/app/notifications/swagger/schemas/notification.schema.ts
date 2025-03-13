import { SchemaObject } from '@nestjs/swagger/dist/interfaces/open-api-spec.interface';

/**
 * Swagger schema for geolocation
 */
export const geolocationSchema: SchemaObject = {
  type: 'object',
  required: ['latitude', 'longitude', 'type'],
  properties: {
    latitude: {
      type: 'number',
      description: 'Latitude coordinate',
      example: 45.5231,
    },
    longitude: {
      type: 'number',
      description: 'Longitude coordinate',
      example: -122.6765,
    },
    type: {
      type: 'string',
      description: 'Type of geolocation point',
      example: 'Point',
    },
  },
};

/**
 * Swagger schema for event metadata context
 */
export const eventMetadataContextSchema: SchemaObject = {
  type: 'object',
  required: ['deviceId', 'ip_address', 'user_agent', 'hostname', 'language'],
  properties: {
    deviceId: {
      type: 'string',
      description: 'Unique identifier for the device',
      example: 'device-123',
    },
    ip_address: {
      type: 'string',
      description: 'IP address of the client',
      example: '192.168.1.1',
    },
    user_agent: {
      type: 'string',
      description: 'User agent string of the client',
      example: 'Mozilla/5.0',
    },
    hostname: {
      type: 'string',
      description: 'Hostname of the client',
      example: 'app.example.com',
    },
    language: {
      type: 'string',
      description: 'Preferred language of the client',
      example: 'en-US',
    },
    geolocation: {
      ...geolocationSchema,
      description: 'Geolocation information',
      nullable: true,
    },
  },
};

/**
 * Swagger schema for event metadata
 */
export const eventMetadataSchema: SchemaObject = {
  type: 'object',
  required: ['docker_container_id', 'fi_id', 'config_version', 'context'],
  properties: {
    docker_container_id: {
      type: 'string',
      description: 'ID of the Docker container',
      example: 'container-123',
    },
    fi_id: {
      type: 'string',
      description: 'Financial institution ID',
      example: 'fi-123',
    },
    config_version: {
      type: 'string',
      description: 'Configuration version',
      example: '1.0.0',
    },
    context: {
      ...eventMetadataContextSchema,
      description: 'Context information for the event',
    },
  },
};

/**
 * Swagger schema for activity info
 */
export const activityInfoSchema: SchemaObject = {
  type: 'object',
  required: ['source', 'identifier', 'metadata'],
  properties: {
    source: {
      type: 'string',
      description: 'Source of the activity',
      example: 'web-portal',
    },
    identifier: {
      type: 'string',
      description: 'Identifier of the actor',
      example: 'user-123',
    },
    metadata: {
      type: 'object',
      description: 'Additional metadata about the activity',
      additionalProperties: true,
      example: {
        sessionId: 'session-123',
        ipAddress: '192.168.1.1',
      },
    },
  },
};

/**
 * Swagger schema for event header
 */
export const eventHeaderSchema: SchemaObject = {
  type: 'object',
  required: [
    'event_name',
    'product',
    'product_version',
    'event_version',
    'key_handle',
    'timestamp',
    'callback_ref',
    'alg',
    'typ',
    'tenant',
  ],
  properties: {
    event_name: {
      type: 'string',
      description: 'Name of the event',
      example: 'APPLICATION_UPDATE',
    },
    product: {
      type: 'string',
      description: 'Product identifier',
      example: 'digital-banking',
    },
    product_version: {
      type: 'string',
      description: 'Version of the product',
      example: '2.0.0',
    },
    event_version: {
      type: 'string',
      description: 'Version of the event schema',
      example: '1.0.0',
    },
    key_handle: {
      type: 'string',
      description: 'Handle for the encryption key',
      example: 'key1',
    },
    timestamp: {
      type: 'string',
      format: 'date-time',
      description: 'Timestamp of the event',
    },
    callback_ref: {
      type: 'string',
      description: 'Reference for callback',
      example: 'callback-123',
    },
    alg: {
      type: 'string',
      description: 'Algorithm used for encryption',
      example: 'RS256',
    },
    typ: {
      type: 'string',
      description: 'Type of the token',
      example: 'JWT',
    },
    tenant: {
      type: 'object',
      required: ['financialInstitutionId', 'appId', 'environment'],
      properties: {
        financialInstitutionId: {
          type: 'string',
          description: 'ID of the financial institution',
          example: 'fi-123',
        },
        appId: {
          type: 'string',
          description: 'ID of the application',
          example: 'app-123',
        },
        environment: {
          type: 'string',
          description: 'Environment name',
          example: 'production',
        },
      },
    },
  },
};

/**
 * Swagger schema for notification event
 */
export const notificationEventSchema: SchemaObject = {
  type: 'object',
  required: ['id', 'header', 'payload'],
  properties: {
    id: {
      type: 'string',
      format: 'uuid',
      description: 'Unique identifier for the event',
      example: '123e4567-e89b-12d3-a456-426614174000',
    },
    header: {
      ...eventHeaderSchema,
      description: 'Event header information',
    },
    payload: {
      type: 'object',
      required: ['metadata', 'data', 'activityBy'],
      properties: {
        metadata: {
          ...eventMetadataSchema,
          description: 'Event metadata',
        },
        data: {
          type: 'object',
          description: 'Event payload data',
          additionalProperties: true,
          example: {
            userId: 'user-123',
            action: 'profile_update',
            changes: {
              email: 'user@example.com',
              phone: '+1234567890',
            },
          },
        },
        activityBy: {
          ...activityInfoSchema,
          description: 'Information about who/what triggered the event',
        },
      },
    },
  },
};
