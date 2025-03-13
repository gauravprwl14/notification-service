import { JSONSchemaType } from 'ajv';
import {
  ActivityInfo,
  EventHeader,
  EventMetadata,
  EventMetadataContext,
  EventPayload,
  NotificationEvent,
} from '../../interfaces/event.interface';

/**
 * JSON Schema for event metadata context
 */
export const eventMetadataContextSchema: JSONSchemaType<EventMetadataContext> =
  {
    type: 'object',
    properties: {
      deviceId: { type: 'string' },
      ip_address: { type: 'string' },
      user_agent: { type: 'string' },
      hostname: { type: 'string' },
      language: { type: 'string' },
      geolocation: {
        type: 'object',
        nullable: true,
        properties: {
          latitude: { type: 'number' },
          longitude: { type: 'number' },
          type: { type: 'string' },
        },
        required: ['latitude', 'longitude', 'type'],
        additionalProperties: false,
      },
    },
    required: ['deviceId', 'ip_address', 'user_agent', 'hostname', 'language'],
    additionalProperties: false,
  };

/**
 * JSON Schema for event metadata
 */
export const eventMetadataSchema: JSONSchemaType<EventMetadata> = {
  type: 'object',
  properties: {
    docker_container_id: { type: 'string' },
    fi_id: { type: 'string' },
    config_version: { type: 'string' },
    context: eventMetadataContextSchema,
  },
  required: ['docker_container_id', 'fi_id', 'config_version', 'context'],
  additionalProperties: false,
};

/**
 * JSON Schema for activity info
 */
export const activityInfoSchema: JSONSchemaType<ActivityInfo> = {
  type: 'object',
  properties: {
    source: { type: 'string' },
    identifier: { type: 'string' },
    metadata: {
      type: 'object',
      required: [],
      additionalProperties: true,
    },
  },
  required: ['source', 'identifier', 'metadata'],
  additionalProperties: false,
};

/**
 * JSON Schema for event header
 */
export const eventHeaderSchema: JSONSchemaType<
  EventHeader & {
    tenant: {
      financialInstitutionId: string;
      appId: string;
      environment: string;
    };
  }
> = {
  type: 'object',
  properties: {
    event_name: { type: 'string' },
    product: { type: 'string' },
    product_version: { type: 'string' },
    event_version: { type: 'string' },
    key_handle: { type: 'string' },
    timestamp: { type: 'string' },
    callback_ref: { type: 'string' },
    alg: { type: 'string' },
    typ: { type: 'string' },
    tenant: {
      type: 'object',
      properties: {
        financialInstitutionId: { type: 'string' },
        appId: { type: 'string' },
        environment: { type: 'string' },
      },
      required: ['financialInstitutionId', 'appId', 'environment'],
      additionalProperties: false,
    },
  },
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
  additionalProperties: false,
};

/**
 * JSON Schema for event payload
 */
export const eventPayloadSchema: JSONSchemaType<
  EventPayload<Record<string, unknown>>
> = {
  type: 'object',
  properties: {
    metadata: eventMetadataSchema,
    data: {
      type: 'object',
      required: [],
      additionalProperties: true,
    },
    activityBy: activityInfoSchema,
  },
  required: ['metadata', 'data', 'activityBy'],
  additionalProperties: false,
};

/**
 * JSON Schema for notification event
 */
export const notificationEventSchema: JSONSchemaType<
  NotificationEvent<Record<string, unknown>>
> = {
  type: 'object',
  properties: {
    id: { type: 'string' },
    header: eventHeaderSchema,
    payload: eventPayloadSchema,
  },
  required: ['id', 'header', 'payload'],
  additionalProperties: false,
};
