# Notification Service API

The Notification Service API is a RESTful service that provides endpoints for sending notifications through various providers. It's built with NestJS and is part of the Notification Service monorepo.

## Overview

The API serves as the entry point for client applications to send notifications. It handles authentication, validation, provider selection, and dispatching of notification events to the appropriate messaging system (SNS/SQS).

## Architecture

### Key Components

- **Controllers**: Handle HTTP requests and responses
  - `NotificationsController`: Processes notification requests
  - `HealthController`: Provides health check endpoints

- **Services**: Contain business logic
  - `NotificationsService`: Handles notification creation and routing

- **Modules**:
  - `AppModule`: Root module that imports all other modules
  - `NotificationsModule`: Contains notification-related components
  - `HealthModule`: Contains health check components

- **Providers**:
  - Uses provider adapters from the `provider-adapters` library
  - Integrates with AWS services (SNS, SQS, KMS)

### Data Flow

1. Client sends a notification request to the API
2. API validates the request and authenticates the client
3. API selects the appropriate provider based on tenant configuration
4. API dispatches the notification to the selected provider
5. Provider sends the notification to the appropriate messaging system
6. API returns a response to the client

## API Endpoints

### Notifications

- `POST /api/notifications`: Create a new notification
  - Request Body: `CreateNotificationDto`
  - Response: Notification send result

### Health

- `GET /api/health`: Check API health status
  - Response: Health check result with disk and memory status

## Configuration

The API is configured using environment variables. See `.env.example` for a list of available variables.

### Required Environment Variables

- `AWS_REGION`: AWS region (e.g., us-east-1)
- `AWS_ACCESS_KEY_ID`: AWS access key ID
- `AWS_SECRET_ACCESS_KEY`: AWS secret access key
- `SNS_TOPIC_ARN`: ARN of the SNS topic for notifications
- `KMS_KEY_ID`: ID of the KMS key for encryption/decryption

### Optional Environment Variables

- `PORT`: Port to run the API on (default: 3000)
- `NODE_ENV`: Environment (development, production, test)
- `AWS_ENDPOINT`: AWS endpoint URL (for LocalStack)
- `REDIS_HOST`: Redis host (default: localhost)
- `REDIS_PORT`: Redis port (default: 6379)
- `LOG_LEVEL`: Logging level (error, warn, info, debug, verbose)

## Development

### Running the API

```bash
# Development mode
npx nx serve api

# Production build
npx nx build api
node dist/apps/api/main.js
```

### Testing

```bash
# Unit tests
npx nx test api

# E2E tests
npx nx e2e api-e2e
```

### Docker

The API can be run in a Docker container using the provided Dockerfile:

```bash
# Build the Docker image
docker build -t notification-service-api -f apps/api/Dockerfile .

# Run the Docker container
docker run -p 3000:3000 --env-file .env notification-service-api
```

#### Docker Compose

For a complete development environment with all services, use Docker Compose:

```bash
# From the root directory (where docker-compose.yml is located)
docker-compose build
docker-compose up -d
```

If you encounter build issues, try using the provided setup script:

```bash
# From the notification-service directory
./docker-setup.sh
```

This script will:
1. Create necessary .env files if they don't exist
2. Make the LocalStack init script executable
3. Build and start all Docker containers
4. Initialize AWS resources in LocalStack

## Error Handling

The API implements robust error handling with:

- Validation errors for invalid requests
- Authentication errors for unauthorized requests
- Provider errors for failed notification delivery
- Connection retry mechanism for AWS services

## Monitoring and Observability

The API includes:

- Health check endpoint for monitoring
- Logging with configurable levels
- Integration with OpenTelemetry for distributed tracing

## Troubleshooting

### Common Issues

#### Connection Errors

If you see `AggregateError` or connection errors:

1. Ensure Redis and LocalStack are running and healthy
2. Check AWS credentials in environment variables
3. Verify network connectivity between services
4. Check service logs for specific error messages

#### AWS Service Errors

If AWS services are not working:

1. Verify AWS credentials are correct
2. Check LocalStack is running (for local development)
3. Ensure required AWS resources (SNS topics, KMS keys) exist
4. Check AWS service endpoints are accessible

## API Documentation

Swagger documentation is available at `/docs` when the API is running.

## Dependencies

- `@nestjs/core`: NestJS core framework
- `@nestjs/common`: NestJS common utilities
- `@nestjs/config`: Configuration management
- `@nestjs/swagger`: API documentation
- `@nestjs/terminus`: Health checks
- `@aws-sdk/client-sns`: AWS SNS client
- `@aws-sdk/client-kms`: AWS KMS client
- `class-validator`: Request validation
- `class-transformer`: Object transformation 