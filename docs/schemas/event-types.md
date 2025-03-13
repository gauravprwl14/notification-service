# Event Types and Schemas

## Overview
This document describes the various event types supported by the Notification Service and their corresponding schemas. All events must conform to these schemas for successful processing.

## Event Types

### Application Events
| Event Name | Description | Use Case |
|------------|-------------|-----------|
| `APPLICATION_UPDATE` | Application state changes | Profile updates, settings changes |
| `APPLICATION_CREATE` | New application creation | User registration, app onboarding |
| `USER_UPDATE` | User profile changes | Password changes, preference updates |

## Event Structure

### Base Event Interface
```typescript
interface NotificationEvent<T = Record<string, unknown>> {
  id: string;
  header: EventHeader;
  payload: EventPayload<T>;
}
```

### Event Header
```typescript
interface EventHeader {
  event_name: string;
  product: string;
  product_version: string;
  event_version: string;
  key_handle: string;
  timestamp: string;
  callback_ref: string;
  alg: string;
  typ: string;
  tenant: {
    financialInstitutionId: string;
    appId: string;
    environment: string;
  };
}
```

### Event Payload
```typescript
interface EventPayload<T> {
  metadata: EventMetadata;
  data: T;
  activityBy: ActivityInfo;
}
```

### Event Metadata
```typescript
interface EventMetadata {
  docker_container_id: string;
  fi_id: string;
  config_version: string;
  context: EventMetadataContext;
}
```

### Event Metadata Context
```typescript
interface EventMetadataContext {
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
```

### Activity Information
```typescript
interface ActivityInfo {
  source: string;
  identifier: string;
  metadata: Record<string, unknown>;
}
```

## Validation Rules

### Required Fields
All fields are required unless marked with `?` (optional).

### Field Formats

#### ID Format
- Must be a valid UUID v4
- Example: `123e4567-e89b-12d3-a456-426614174000`

#### Timestamp Format
- Must be ISO 8601 format
- Example: `2024-03-12T10:30:00.000Z`

#### Version Formats
- Must follow semantic versioning (MAJOR.MINOR.PATCH)
- Examples:
  - `product_version`: `2.0.0`
  - `event_version`: `1.0.0`

#### Geolocation Format
- `latitude`: -90 to 90
- `longitude`: -180 to 180
- `type`: Must be "Point"

## Schema Validation

### JSON Schema
The service uses AJV for JSON Schema validation. Example schema:

```json
{
  "type": "object",
  "required": ["id", "header", "payload"],
  "properties": {
    "id": {
      "type": "string",
      "format": "uuid"
    },
    "header": {
      "type": "object",
      "required": [
        "event_name",
        "product",
        "product_version",
        "event_version",
        "key_handle",
        "timestamp",
        "callback_ref",
        "alg",
        "typ",
        "tenant"
      ],
      "properties": {
        // ... header properties
      }
    },
    "payload": {
      "type": "object",
      "required": ["metadata", "data", "activityBy"],
      "properties": {
        // ... payload properties
      }
    }
  }
}
```

## Best Practices

### Event Naming
1. Use UPPERCASE with underscores
2. Be descriptive and specific
3. Follow the pattern: `ENTITY_ACTION`
   - Example: `APPLICATION_UPDATE`

### Version Management
1. Increment `event_version` for schema changes
2. Maintain backward compatibility
3. Document breaking changes

### Data Field Usage
1. Keep data structure flat when possible
2. Use consistent property naming
3. Include only relevant information

### Metadata Best Practices
1. Always include accurate context
2. Provide detailed activity information
3. Use consistent timestamp formats

## Examples

### Application Update Event
```json
{
  "id": "123e4567-e89b-12d3-a456-426614174000",
  "header": {
    "event_name": "APPLICATION_UPDATE",
    "product": "digital-banking",
    "product_version": "2.0.0",
    "event_version": "1.0.0",
    "key_handle": "key1",
    "timestamp": "2024-03-12T10:30:00.000Z",
    "callback_ref": "callback-123",
    "alg": "RS256",
    "typ": "JWT",
    "tenant": {
      "financialInstitutionId": "fi-123",
      "appId": "app-123",
      "environment": "production"
    }
  },
  "payload": {
    "metadata": {
      "docker_container_id": "container-123",
      "fi_id": "fi-123",
      "config_version": "1.0.0",
      "context": {
        "deviceId": "device-123",
        "ip_address": "192.168.1.1",
        "user_agent": "Mozilla/5.0",
        "hostname": "app.example.com",
        "language": "en-US",
        "geolocation": {
          "latitude": 45.5231,
          "longitude": -122.6765,
          "type": "Point"
        }
      }
    },
    "data": {
      "userId": "user-123",
      "action": "profile_update",
      "changes": {
        "email": "user@example.com",
        "phone": "+1234567890"
      }
    },
    "activityBy": {
      "source": "web-portal",
      "identifier": "user-123",
      "metadata": {
        "sessionId": "session-123",
        "ipAddress": "192.168.1.1"
      }
    }
  }
} 