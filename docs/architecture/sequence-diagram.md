# Notification Service Sequence Diagrams

## Overview
This document provides detailed sequence diagrams illustrating the various flows within the Notification Service.

## Notification Processing Flow

```mermaid
sequenceDiagram
    participant C as Client
    participant API as API Gateway
    participant NC as NotificationsController
    participant NS as NotificationsService
    participant PF as ProviderFactory
    participant P as Provider (SNS/SQS)
    participant AWS as AWS Service
    participant DLQ as Dead Letter Queue

    C->>+API: POST /notifications
    Note over C,API: Event payload with metadata

    API->>+NC: create(event)
    NC->>NC: validate(event)
    Note over NC: Validate event schema
    
    NC->>+NS: processEvent(event)
    NS->>NS: enrichEvent(event)
    Note over NS: Add timestamps, IDs

    NS->>+PF: createProvider(type)
    PF-->>-NS: provider instance
    
    NS->>+P: send(event)
    
    alt Success Scenario
        P->>+AWS: publish(message)
        AWS-->>-P: messageId
        P-->>-NS: success response
        NS-->>-NC: notification result
        NC-->>-API: 202 Accepted
        API-->>-C: success response
        
    else Provider Error
        P->>P: retry logic
        Note over P: Implement exponential backoff
        P->>AWS: publish(message)
        AWS-->>P: error
        P->>DLQ: move to DLQ
        P-->>NS: error response
        NS-->>NC: error details
        NC-->>API: error status
        API-->>C: error response
    end
```

## Error Handling Flow

```mermaid
sequenceDiagram
    participant C as Client
    participant API as API Gateway
    participant NC as NotificationsController
    participant NS as NotificationsService
    participant EH as ErrorHandler
    participant L as Logger
    participant M as Metrics

    C->>+API: POST /notifications
    
    API->>+NC: create(event)
    
    alt Validation Error
        NC->>NC: validate(event)
        NC->>EH: handleValidationError
        EH->>L: logError
        EH->>M: incrementErrorMetric
        EH-->>NC: ValidationError
        NC-->>API: 400 Bad Request
        API-->>C: Validation error response
        
    else Provider Error
        NC->>+NS: processEvent(event)
        NS->>NS: send(event)
        NS->>EH: handleProviderError
        EH->>L: logError
        EH->>M: incrementErrorMetric
        EH-->>NS: ProviderError
        NS-->>NC: error response
        NC-->>API: 503 Service Unavailable
        API-->>C: Provider error response
        
    else System Error
        NC->>+NS: processEvent(event)
        NS->>NS: internal processing
        NS->>EH: handleSystemError
        EH->>L: logError
        EH->>M: incrementErrorMetric
        EH-->>NS: SystemError
        NS-->>NC: error response
        NC-->>API: 500 Internal Server Error
        API-->>C: System error response
    end
```

## Provider Initialization Flow

```mermaid
sequenceDiagram
    participant App as Application
    participant CM as ConfigModule
    participant PF as ProviderFactory
    participant P as Provider
    participant AWS as AWS Services
    participant Cache as ConfigCache

    App->>+CM: initialize()
    CM->>CM: loadConfig()
    CM->>+PF: createProvider(type)
    
    alt SNS Provider
        PF->>+P: new SNSProvider(config)
        P->>Cache: getCachedConfig()
        
        alt Cache Hit
            Cache-->>P: cached config
        else Cache Miss
            P->>+AWS: validateCredentials()
            AWS-->>-P: credentials valid
            P->>+AWS: describeTopic()
            AWS-->>-P: topic info
            P->>Cache: cacheConfig()
        end
        
        P->>P: initialize()
        P-->>-PF: provider instance
        
    else SQS Provider
        PF->>+P: new SQSProvider(config)
        P->>Cache: getCachedConfig()
        
        alt Cache Hit
            Cache-->>P: cached config
        else Cache Miss
            P->>+AWS: validateCredentials()
            AWS-->>-P: credentials valid
            P->>+AWS: getQueueUrl()
            AWS-->>-P: queue url
            P->>Cache: cacheConfig()
        end
        
        P->>P: initialize()
        P-->>-PF: provider instance
    end
    
    PF-->>-CM: initialized provider
    CM-->>-App: initialization complete
```

## Retry and Recovery Flow

```mermaid
sequenceDiagram
    participant C as Client
    participant NS as NotificationService
    participant P as Provider
    participant AWS as AWS Service
    participant DLQ as Dead Letter Queue
    participant RM as RetryManager

    C->>+NS: send notification
    NS->>+P: publish(message)
    
    alt Initial Failure
        P->>AWS: publish
        AWS-->>P: error
        P->>RM: handleRetry(message, attempt=1)
        
        loop Retry Logic
            RM->>RM: calculateBackoff()
            RM->>P: retry(message)
            P->>AWS: publish
            
            alt Success
                AWS-->>P: success
                P-->>NS: success
                NS-->>C: success response
            else Continued Failure
                AWS-->>P: error
                RM->>RM: incrementAttempt()
                
                alt Max Retries Reached
                    RM->>DLQ: moveToDLQ(message)
                    RM-->>P: failure
                    P-->>NS: error
                    NS-->>C: error response
                else Retries Remaining
                    RM->>RM: wait(backoff)
                    Note over RM: Continue retry loop
                end
            end
        end
    end
```

## Health Check Flow

```mermaid
sequenceDiagram
    participant C as Client
    participant HC as HealthController
    participant HS as HealthService
    participant P as Providers
    participant AWS as AWS Services
    participant DB as Dependencies

    C->>+HC: GET /health
    HC->>+HS: checkHealth()
    
    par Check AWS Services
        HS->>+P: checkProviderHealth()
        P->>AWS: checkConnection()
        AWS-->>P: status
        P-->>HS: provider status
    and Check Dependencies
        HS->>+DB: checkConnection()
        DB-->>-HS: connection status
    end
    
    HS->>HS: aggregateStatus()
    HS-->>-HC: health status
    HC-->>-C: health response
```

## Monitoring and Metrics Flow

```mermaid
sequenceDiagram
    participant NS as NotificationService
    participant M as MetricsCollector
    participant P as Provider
    participant AWS as AWS Service
    participant CW as CloudWatch
    participant A as Alerting

    NS->>+P: send(message)
    
    par Collect Metrics
        P->>M: incrementRequestCount()
        P->>M: recordLatency(start)
        P->>+AWS: publish
        AWS-->>-P: response
        P->>M: recordLatency(end)
        
        alt Success
            P->>M: incrementSuccessCount()
        else Failure
            P->>M: incrementErrorCount()
            P->>M: recordErrorType()
        end
    end
    
    M->>+CW: publishMetrics()
    CW->>CW: evaluateAlarms()
    
    alt Threshold Exceeded
        CW->>+A: triggerAlert()
        A->>A: notifyTeam()
    end
    
    P-->>NS: response
``` 