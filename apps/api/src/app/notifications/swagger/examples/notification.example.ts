import { EventName } from '@notification-service/core';

/**
 * Example notification event for Swagger documentation
 */
export const notificationExample = {
  id: '123e4567-e89b-12d3-a456-426614174000',
  header: {
    event_name: EventName.APPLICATION_UPDATE,
    product: 'digital-banking',
    product_version: '2.0.0',
    event_version: '1.0.0',
    key_handle: 'key1',
    timestamp: new Date().toISOString(),
    callback_ref: 'callback-123',
    alg: 'RS256',
    typ: 'JWT',
    tenant: {
      financialInstitutionId: 'fi-123',
      appId: 'app-123',
      environment: 'production',
    },
  },
  payload: {
    metadata: {
      docker_container_id: 'container-123',
      fi_id: 'fi-123',
      config_version: '1.0.0',
      context: {
        deviceId: 'device-123',
        ip_address: '192.168.1.1',
        user_agent: 'Mozilla/5.0',
        hostname: 'app.example.com',
        language: 'en-US',
        geolocation: {
          latitude: 45.5231,
          longitude: -122.6765,
          type: 'Point',
        },
      },
    },
    data: {
      applicationId: 'app-123',
      status: 'active',
      userId: 'user-123',
      action: 'profile_update',
      changes: {
        email: 'user@example.com',
        phone: '+1234567890',
      },
    },
    activityBy: {
      source: 'web-portal',
      identifier: 'user-123',
      metadata: {
        sessionId: 'session-123',
        ipAddress: '192.168.1.1',
      },
    },
  },
};
