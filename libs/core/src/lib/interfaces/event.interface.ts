/**
 * Base event header interface
 */
export interface EventHeader {
  event_name: string;
  product: string;
  product_version: string;
  event_version: string;
  key_handle: string;
  timestamp: string;
  callback_ref: string;
  alg: string;
  typ: string;
}

/**
 * Base metadata context interface
 */
export interface EventMetadataContext {
  deviceId: string;
  ip_address: string;
  user_agent: string;
  hostname: string;
  language: string;
  geolocation?: {
    latitude: number;
    longitude: number;
    type: string;
  };
}

/**
 * Base metadata interface
 */
export interface EventMetadata {
  docker_container_id: string;
  fi_id: string;
  config_version: string;
  context: EventMetadataContext;
}

/**
 * Base activity information interface
 */
export interface ActivityInfo {
  source: string;
  identifier: string;
  metadata: Record<string, unknown>;
}

/**
 * Base event payload interface
 */
export interface EventPayload<T = unknown> {
  metadata: EventMetadata;
  data: T;
  activityBy: ActivityInfo;
}

/**
 * Base notification event interface
 */
export interface NotificationEvent<T = unknown> {
  id: string;
  header: EventHeader & {
    tenant: {
      financialInstitutionId: string;
      appId: string;
      environment: string;
    };
  };
  payload: EventPayload<T>;
}

/**
 * Application update data interface
 */
export interface ApplicationUpdateData {
  message: string;
  messageKey: string;
  status: string;
  application: {
    id: string;
    naoUserId: string;
    oldValue: Record<string, unknown>;
    newValue: Record<string, unknown>;
  };
  updatedAt: string;
}

/**
 * Supported event names enum
 */
export enum EventName {
  APPLICATION_UPDATE = 'com.tyfone.nao.application.update',
  APPLICATION_CREATE = 'com.tyfone.nao.application.create',
  USER_UPDATE = 'com.tyfone.nao.user.update',
}
