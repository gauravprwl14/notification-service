# Notification Service Lambda Processor

The Lambda Processor is a serverless application that processes notification events from SQS queues. It's built with NestJS and is designed to run as an AWS Lambda function or as a standalone service.

## Overview

The Lambda Processor is responsible for:
- Consuming notification events from SQS queues
- Decrypting encrypted payloads using KMS
- Processing notifications based on their type
- Handling errors and retries

## Architecture

### Key Components

- **Handlers**: Process different types of events
  - `NotificationHandler`: Processes notification events from SQS

- **Modules**:
  - `AppModule`: Root module that imports all other modules
  - `HandlersModule`: Contains event handlers

- **Services**:
  - Uses the `EncryptionService` from the core library for payload decryption
  - Integrates with AWS services (SQS, KMS)

### Data Flow

1. SQS message triggers the Lambda function
2. Lambda function parses the message and extracts the notification event
3. Handler decrypts the encrypted payload using KMS
4. Handler processes the notification based on its type
5. Handler logs the result and completes the processing

## Lambda Function

The Lambda function is defined in `main.ts` and uses the NestJS application context to process events:

```typescript
export const handler: Handler = async (event: SQSEvent, context: Context) => {
  // Create a NestJS application context
  const app = await NestFactory.createApplicationContext(AppModule);
  
  // Get the notification handler from the application context
  const notificationHandler = app.get(NotificationHandler);
  
  // Process the SQS event
  await notificationHandler.processSqsEvent(event);
  
  // Close the application context
  await app.close();
  
  return {
    statusCode: 200,
    body: JSON.stringify({
      message: 'Event processed successfully',
    }),
  };
};
```

## Configuration

The Lambda Processor is configured using environment variables. See `.env.example` for a list of available variables.

### Required Environment Variables

- `AWS_REGION`: AWS region (e.g., us-east-1)
- `AWS_ACCESS_KEY_ID`: AWS access key ID
- `AWS_SECRET_ACCESS_KEY`: AWS secret access key
- `SQS_QUEUE_URL`: URL of the SQS queue for notifications
- `SQS_DLQ_URL`: URL of the SQS dead-letter queue
- `KMS_KEY_ID`: ID of the KMS key for decryption

### Optional Environment Variables

- `PORT`: Port to run the service on (default: 3001, for local development)
- `NODE_ENV`: Environment (development, production, test)
- `AWS_ENDPOINT`: AWS endpoint URL (for LocalStack)
- `REDIS_HOST`: Redis host (default: localhost)
- `REDIS_PORT`: Redis port (default: 6379)
- `LOG_LEVEL`: Logging level (error, warn, info, debug, verbose)

## Development

### Running the Lambda Processor

```bash
# Development mode (as a standalone service)
npx nx serve lambda-processor

# Production build
npx nx build lambda-processor
node dist/apps/lambda-processor/main.js
```

### Testing

```bash
# Unit tests
npx nx test lambda-processor

# E2E tests
npx nx e2e lambda-processor-e2e
```

### Docker

The Lambda Processor can be run in a Docker container using the provided Dockerfile:

```bash
# Build the Docker image
docker build -t notification-service-lambda -f apps/lambda-processor/Dockerfile .

# Run the Docker container
docker run --env-file .env notification-service-lambda
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

### AWS Lambda Deployment

To deploy the Lambda Processor to AWS Lambda:

1. Build the application:
   ```bash
   npx nx build lambda-processor
   ```

2. Create a deployment package:
   ```bash
   cd dist/apps/lambda-processor
   zip -r lambda-function.zip .
   ```

3. Deploy to AWS Lambda:
   ```bash
   aws lambda create-function \
     --function-name notification-processor \
     --runtime nodejs18.x \
     --handler main.handler \
     --zip-file fileb://lambda-function.zip \
     --role arn:aws:iam::123456789012:role/lambda-execution-role
   ```

## Error Handling

The Lambda Processor implements robust error handling with:

- Automatic retries for transient errors
- Dead-letter queue for failed messages
- Detailed error logging
- Connection retry mechanism for AWS services

## Monitoring and Observability

The Lambda Processor includes:

- Detailed logging with configurable levels
- Integration with AWS CloudWatch for metrics and logs
- Integration with OpenTelemetry for distributed tracing

## Troubleshooting

### Common Issues

#### Connection Errors

If you see `AggregateError` or connection errors:

1. Ensure AWS services are accessible
2. Check AWS credentials in environment variables
3. Verify network connectivity
4. Check service logs for specific error messages

#### Decryption Errors

If payload decryption fails:

1. Verify KMS key ID is correct
2. Ensure Lambda has permission to use the KMS key
3. Check encryption context matches between encryption and decryption
4. Verify the encrypted payload format is correct

#### SQS Message Processing Errors

If SQS message processing fails:

1. Check SQS queue URL is correct
2. Ensure Lambda has permission to read from the SQS queue
3. Verify message format matches expected structure
4. Check for errors in the message handler logic

## Dependencies

- `@nestjs/core`: NestJS core framework
- `@nestjs/common`: NestJS common utilities
- `@nestjs/config`: Configuration management
- `@aws-sdk/client-sqs`: AWS SQS client
- `@aws-sdk/client-kms`: AWS KMS client
- `aws-lambda`: AWS Lambda types and utilities

# Lambda Processor Deployment

This directory contains the Lambda processor for the notification service and a script to deploy it to AWS Lambda.

## Prerequisites

- Node.js 18 or later
- npm
- AWS CLI configured with appropriate credentials
- AWS account with permissions to create Lambda functions, IAM roles, and SQS triggers

## Deployment Steps

1. **Setup your environment**

   Make sure you have the AWS CLI installed and configured:
   ```bash
   aws configure
   ```

2. **Build and deploy the Lambda function**

   Run the deployment script:
   ```bash
   ./deploy-lambda.sh
   ```

   This script will:
   - Create a package.json and tsconfig.json if they don't exist
   - Build the Lambda function using TypeScript
   - Create a deployment package
   - Deploy to AWS Lambda
   - Offer to set up SQS triggers

3. **Custom deployment options**

   You can specify a custom Lambda name and AWS region:
   ```bash
   ./deploy-lambda.sh my-lambda-name us-west-2
   ```

## Environment Variables

After deployment, set these environment variables in the AWS Lambda console:

- `AWS_REGION`: AWS region
- `AWS_ACCESS_KEY_ID`: AWS access key
- `AWS_SECRET_ACCESS_KEY`: AWS secret key
- `SQS_QUEUE_URL`: SQS queue URL
- `SQS_DLQ_URL`: SQS dead-letter queue URL
- `KMS_KEY_ID`: KMS key ID for encryption
- `REDIS_HOST`: Redis host
- `REDIS_PORT`: Redis port
- `SALESFORCE_CLIENT_ID`: Salesforce client ID
- `SALESFORCE_USERNAME`: Salesforce username
- `SALESFORCE_PRIVATE_KEY_PATH`: Path to Salesforce private key

## Development

To develop locally:

1. Install dependencies:
   ```bash
   npm install
   ```

2. Build the project:
   ```bash
   npm run build
   ```

3. Package for deployment:
   ```bash
   npm run package
   ```

## Troubleshooting

- **Deployment fails with SSL errors**: Try setting SSL certificates manually:
  ```bash
  export SSL_CERT_FILE=/path/to/cert.pem
  export REQUESTS_CA_BUNDLE=/path/to/cert.pem
  ```

- **Package too large**: Use Lambda layers for dependencies or optimize your code further.

- **Lambda function not triggering**: Check the SQS trigger configuration and Lambda permissions. 