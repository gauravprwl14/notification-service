# Data Flow Architecture

## Overview
This document details the data flow within the Notification Service, from request reception to message delivery and response handling.

## Request Flow

### 1. Request Reception and Validation

```mermaid
sequenceDiagram
    participant C as Client
    participant API as API Gateway
    participant NC as NotificationsController
    participant VS as ValidationService

    C->>+API: POST /notifications
    API->>+NC: Forward Request
    NC->>+VS: validateEvent(event)
    
    alt Valid Event
        VS-->>-NC: Validation Success
        NC->>NC: Process Event
    else Invalid Event
        VS-->>-NC: Validation Errors
        NC-->>-API: 400 Bad Request
        API-->>-C: Error Response
    end
```

### 2. Event Processing Flow

```mermaid
sequenceDiagram
    participant NC as NotificationsController
    participant NS as NotificationsService
    participant PF as ProviderFactory
    participant P as Provider
    participant AWS as AWS Service

    NC->>+NS: processEvent(event)
    NS->>NS: enrichEvent(event)
    NS->>+PF: createProvider(type)
    PF-->>-NS: provider instance
    
    NS->>+P: send(event)
    P->>+AWS: publish(message)
    AWS-->>-P: messageId
    P-->>-NS: result
    NS-->>-NC: response
```

## Data Transformation

### 1. Event Enrichment
```typescript
interface EventEnrichment {
    // Original event
    originalEvent: NotificationEvent;

    // Enrichment steps
    steps: {
        // Add timestamps
        addTimestamps(): void;
        
        // Add correlation IDs
        addCorrelationIds(): void;
        
        // Add routing information
        addRoutingInfo(): void;
        
        // Add tenant context
        addTenantContext(): void;
    };

    // Validation
    validate(): ValidationResult;
}
```

### 2. Provider Message Transformation
```typescript
interface MessageTransformation {
    // Transform for SNS
    toSNSMessage(): {
        TopicArn: string;
        Message: string;
        MessageAttributes: Record<string, MessageAttributeValue>;
    };

    // Transform for SQS
    toSQSMessage(): {
        QueueUrl: string;
        MessageBody: string;
        MessageAttributes: Record<string, MessageAttributeValue>;
    };
}
```

## Message Flow

### 1. SNS Publishing Flow

```mermaid
sequenceDiagram
    participant NS as NotificationService
    participant SP as SNSProvider
    participant SNS as AWS SNS
    participant Sub as Subscribers

    NS->>+SP: send(event)
    SP->>SP: transformMessage()
    SP->>+SNS: publish(message)
    SNS->>SNS: validate message
    SNS->>Sub: distribute message
    SNS-->>-SP: messageId
    SP-->>-NS: result
```

### 2. SQS Publishing Flow

```mermaid
sequenceDiagram
    participant NS as NotificationService
    participant SQP as SQSProvider
    participant SQS as AWS SQS
    participant Con as Consumers

    NS->>+SQP: send(event)
    SQP->>SQP: transformMessage()
    SQP->>+SQS: sendMessage(message)
    SQS->>SQS: enqueue message
    SQS-->>-SQP: messageId
    SQP-->>-NS: result
    
    Con->>SQS: pollMessages()
    SQS-->>Con: messages
```

## Error Flow

### 1. Error Handling and Retry Flow

```mermaid
sequenceDiagram
    participant NS as NotificationService
    participant P as Provider
    participant RM as RetryManager
    participant DLQ as DeadLetterQueue
    participant M as Metrics

    NS->>+P: send(event)
    
    alt Initial Failure
        P->>P: handleError()
        P->>+RM: retry(event)
        
        loop Retry Attempts
            RM->>RM: calculateBackoff()
            RM->>P: attemptRetry()
            
            alt Success
                P-->>-RM: success
                RM-->>NS: success result
            else Continued Failure
                alt Max Retries Reached
                    RM->>DLQ: moveToDeadLetter()
                    RM-->>P: failure
                    P-->>NS: error result
                else Retry Available
                    RM->>RM: wait(backoff)
                end
            end
        end
        
        P->>M: recordMetrics()
    end
```

### 2. Dead Letter Queue Flow

```mermaid
sequenceDiagram
    participant P as Provider
    participant DLQ as DeadLetterQueue
    participant AL as AuditLog
    participant M as Metrics

    P->>+DLQ: moveToDeadLetter(message)
    DLQ->>DLQ: enrichMessage()
    DLQ->>AL: logFailure()
    DLQ->>M: incrementDLQMetric()
    DLQ-->>-P: confirmation
```

## Data Storage

### 1. Event Storage
```typescript
interface EventStorage {
    // Store event
    store(event: NotificationEvent): Promise<void>;

    // Retrieve event
    retrieve(eventId: string): Promise<NotificationEvent>;

    // List events
    list(filters: EventFilters): Promise<NotificationEvent[]>;

    // Delete event
    delete(eventId: string): Promise<void>;
}
```

### 2. Audit Trail
```typescript
interface AuditTrail {
    // Log event
    logEvent(event: NotificationEvent): Promise<void>;

    // Log error
    logError(error: Error, context: ErrorContext): Promise<void>;

    // Log metrics
    logMetrics(metrics: EventMetrics): Promise<void>;

    // Query audit trail
    query(filters: AuditFilters): Promise<AuditEntry[]>;
}
```

## Monitoring Flow

### 1. Metrics Collection

```mermaid
sequenceDiagram
    participant P as Provider
    participant M as MetricsCollector
    participant CW as CloudWatch
    participant A as Alerts

    P->>+M: recordMetric(name, value)
    M->>M: aggregateMetrics()
    M->>+CW: putMetricData()
    CW->>CW: evaluateAlarms()
    
    alt Threshold Exceeded
        CW->>A: triggerAlert()
        A->>A: notifyTeam()
    end
    
    CW-->>-M: confirmation
    M-->>-P: done
```

### 2. Logging Flow

```mermaid
sequenceDiagram
    participant C as Component
    participant L as Logger
    participant F as LogFormatter
    participant S as LogShipper
    participant CW as CloudWatch

    C->>+L: log(message, context)
    L->>+F: format(message, context)
    F-->>-L: formatted log
    L->>+S: ship(formattedLog)
    S->>CW: putLogEvents()
    CW-->>S: confirmation
    S-->>-L: shipped
    L-->>-C: done
```

## Security Flow

### 1. Authentication Flow

```mermaid
sequenceDiagram
    participant C as Client
    participant AG as API Gateway
    participant AM as AuthMiddleware
    participant TS as TokenService
    participant NC as NotificationsController

    C->>+AG: Request + Token
    AG->>+AM: Authenticate
    AM->>+TS: validateToken()
    
    alt Valid Token
        TS-->>-AM: Valid
        AM->>NC: Forward Request
    else Invalid Token
        TS-->>-AM: Invalid
        AM-->>-AG: 401 Unauthorized
        AG-->>-C: Error Response
    end
```

### 2. Authorization Flow

```mermaid
sequenceDiagram
    participant AM as AuthMiddleware
    participant AC as AccessControl
    participant TC as TenantContext
    participant NC as NotificationsController

    AM->>+AC: checkPermissions(user, resource)
    AC->>+TC: validateTenant()
    
    alt Valid Access
        TC-->>-AC: Valid
        AC-->>-AM: Authorized
        AM->>NC: Forward Request
    else Invalid Access
        TC-->>-AC: Invalid
        AC-->>-AM: Denied
        AM->>AM: Return 403
    end
```

## References

### Internal Documentation
- [API Documentation](../api/endpoints.md)
- [Error Handling](../api/error-handling.md)
- [Event Types](../schemas/event-types.md)

### External Documentation
- [AWS SNS Developer Guide](https://docs.aws.amazon.com/sns/latest/dg/welcome.html)
- [AWS SQS Developer Guide](https://docs.aws.amazon.com/AWSSimpleQueueService/latest/SQSDeveloperGuide/welcome.html)
- [NestJS Documentation](https://docs.nestjs.com/) 