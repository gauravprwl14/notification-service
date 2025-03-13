# Error Handling

## Overview
The Notification Service implements a comprehensive error handling system that provides detailed error information and maintains consistency across all endpoints. This document outlines the error handling approach, error types, and best practices for handling errors.

## Error Response Structure

### Standard Error Response
```typescript
{
  errors: Array<{
    errorCode: string;      // Unique error identifier
    message: string;        // Human-readable error message
    errorType: ErrorType;   // Type of error (e.g., VALIDATION, BUSINESS, TECHNICAL)
    errorCategory: ErrorCategory; // Category (e.g., CLIENT, SERVER)
    messageKey: string;     // Internationalization key
    data?: Record<string, unknown>; // Additional context (optional)
  }>
}
```

## Error Types

### Validation Errors (NOT prefix)
| Code | Description | Example |
|------|-------------|---------|
| `NOT1001` | Invalid event structure | Missing required fields |
| `NOT1002` | Invalid event header | Invalid event name |
| `NOT1003` | Invalid event payload | Malformed data |
| `NOT1004` | Unsupported event type | Event type not configured |

### Business Logic Errors
| Code | Description | Example |
|------|-------------|---------|
| `NOT2001` | Event processing failed | Provider unavailable |
| `NOT2002` | Event validation failed | Business rule violation |
| `NOT2003` | Event transformation failed | Data mapping error |

### Technical Errors
| Code | Description | Example |
|------|-------------|---------|
| `NOT5001` | Internal server error | Unexpected system error |
| `NOT5002` | Database error | Connection failure |
| `NOT5003` | External service error | AWS service unavailable |

## Error Categories

### Client Errors (4xx)
- Validation failures
- Authentication errors
- Authorization errors
- Rate limiting violations

### Server Errors (5xx)
- Internal processing errors
- Infrastructure issues
- External service failures

## Error Handling Best Practices

### For API Consumers
1. **Always check error responses**
   - Parse the error response body
   - Handle multiple errors in the array
   - Use error codes for programmatic handling

2. **Implement retry logic**
   - Only retry on specific error types
   - Use exponential backoff
   - Respect rate limiting headers

3. **Log error details**
   - Include error codes and messages
   - Log additional context from data field
   - Track error patterns

### For API Developers
1. **Error Creation**
   ```typescript
   throw NotificationError.sendFailed(
     error,
     { eventId: event.id },
     requestId
   );
   ```

2. **Error Extension**
   ```typescript
   export class NotificationError extends BaseError {
     constructor(params: {
       message: string;
       errorCode: NotificationErrorCode;
       data?: Record<string, unknown>;
       originalError?: Error;
       requestId?: string;
     }) {
       super({
         ...params,
         errorType: ErrorType.BUSINESS,
         errorCategory: ErrorCategory.NOTIFICATION,
         messageKey: `error.notification.${params.errorCode.toLowerCase()}`
       });
     }
   }
   ```

## Error Prevention
1. **Input Validation**
   - Use JSON Schema validation
   - Validate business rules
   - Check data types and formats

2. **Defensive Programming**
   - Handle edge cases
   - Validate external service responses
   - Implement timeouts

3. **Monitoring and Alerting**
   - Track error rates
   - Set up alerts for critical errors
   - Monitor error patterns

## Debugging Errors

### Common Error Scenarios

#### Topic Not Configured
```json
{
  "errors": [{
    "errorCode": "NOTIFICATION_001",
    "message": "No topic configured for event type: APPLICATION_UPDATE",
    "errorType": "BUSINESS",
    "errorCategory": "CLIENT",
    "messageKey": "error.notification.topic_not_configured",
    "data": {
      "eventName": "APPLICATION_UPDATE"
    }
  }]
}
```

#### Provider Not Initialized
```json
{
  "errors": [{
    "errorCode": "NOTIFICATION_002",
    "message": "Provider not initialized: AWS SNS",
    "errorType": "TECHNICAL",
    "errorCategory": "SERVER",
    "messageKey": "error.notification.provider_not_initialized",
    "data": {
      "providerName": "AWS SNS"
    }
  }]
}
```

## Error Recovery

### Automatic Recovery
- Retry mechanisms
- Circuit breakers
- Fallback providers

### Manual Recovery
- Error investigation steps
- Recovery procedures
- Escalation paths

## Internationalization
Error messages support internationalization through message keys:
```typescript
{
  messageKey: 'error.notification.invalid_event',
  // Translates to different languages based on Accept-Language header
}
``` 