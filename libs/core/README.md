# Core Library

Core library for the notification service containing shared interfaces, types, and utilities.

## Error Handling

The library implements a standardized error handling approach:

### Base Error Class

All errors extend from `BaseError` which provides:
- Error code for categorization
- Error type (Business, System, Validation)
- Error category for grouping
- Message key for i18n support
- Additional context data
- JSON serialization

### Domain-Specific Errors

- `NotificationError`: Handles notification-specific errors with predefined error codes
  - NOTIFICATION_001: Topic not configured
  - NOTIFICATION_002: Provider not initialized
  - NOTIFICATION_003: Send failed
  - NOTIFICATION_004: Invalid event

### Usage Example

```typescript
// Instead of:
throw new Error('Something went wrong');

// Use:
throw NotificationError.sendFailed(error, context);
```

## Features

- Event interfaces and types
- Validation schemas and services
- Error handling infrastructure
- Shared utilities and constants

## Running unit tests

Run `nx test core` to execute the unit tests via [Jest](https://jestjs.io).
