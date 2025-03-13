# API Endpoints Documentation

## Base URL
```
http://localhost:3000/api/v1
```

## Endpoints

### Create Notification
Creates and sends a new notification through the configured provider.

```http
POST /notifications
```

#### Request Headers
| Name | Type | Required | Description |
|------|------|----------|-------------|
| `Authorization` | `string` | Yes | API key for authentication |
| `Content-Type` | `string` | Yes | Must be `application/json` |

#### Request Body
```typescript
{
  id: string;          // UUID v4
  header: {
    event_name: string;        // Event type (e.g., 'APPLICATION_UPDATE')
    product: string;           // Product identifier
    product_version: string;   // Product version
    event_version: string;     // Event schema version
    key_handle: string;        // Encryption key handle
    timestamp: string;         // ISO 8601 timestamp
    callback_ref: string;      // Callback reference
    alg: string;              // Algorithm (e.g., 'RS256')
    typ: string;              // Token type (e.g., 'JWT')
    tenant: {
      financialInstitutionId: string;
      appId: string;
      environment: string;
    }
  };
  payload: {
    metadata: {
      docker_container_id: string;
      fi_id: string;
      config_version: string;
      context: {
        deviceId: string;
        ip_address: string;
        user_agent: string;
        hostname: string;
        language: string;
        geolocation?: {
          latitude: number;
          longitude: number;
          type: string;
        }
      }
    };
    data: Record<string, unknown>;  // Custom event data
    activityBy: {
      source: string;
      identifier: string;
      metadata: Record<string, unknown>;
    }
  }
}
```

#### Example Request
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
```

#### Responses

##### 202 Accepted
Notification was accepted for processing.

```json
{
  "success": true,
  "messageId": "msg-123e4567-e89b-12d3-a456-426614174000",
  "timestamp": "2024-03-12T10:30:00.000Z"
}
```

##### 400 Bad Request
Invalid request body or validation error.

```json
{
  "errors": [
    {
      "errorCode": "NOTIFICATION_004",
      "message": "Invalid event structure: missing required field header.event_name",
      "errorType": "VALIDATION",
      "errorCategory": "CLIENT",
      "messageKey": "error.notification.invalid_event"
    }
  ]
}
```

##### 401 Unauthorized
Missing or invalid API key.

```json
{
  "statusCode": 401,
  "message": "Unauthorized",
  "error": "Missing or invalid API key"
}
```

#### Error Codes
| Code | Description |
|------|-------------|
| `NOTIFICATION_001` | Topic not configured |
| `NOTIFICATION_002` | Provider not initialized |
| `NOTIFICATION_003` | Send failed |
| `NOTIFICATION_004` | Invalid event |

#### Rate Limiting
- 1000 requests per minute per API key
- Rate limit headers included in response:
  - `X-RateLimit-Limit`
  - `X-RateLimit-Remaining`
  - `X-RateLimit-Reset`

#### Notes
- All timestamps must be in ISO 8601 format
- The `data` field in the payload can contain any valid JSON object
- Geolocation is optional but must follow the specified format if provided
- Event names must match predefined types in the system 