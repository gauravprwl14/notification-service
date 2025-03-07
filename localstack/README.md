# LocalStack for Notification Service

This directory contains the configuration and scripts for running LocalStack, which provides local AWS cloud stack for development and testing.

## Overview

LocalStack is used to emulate AWS services locally, allowing you to develop and test your application without connecting to actual AWS services. This setup includes:

- AWS SNS (Simple Notification Service)
- AWS SQS (Simple Queue Service)
- AWS KMS (Key Management Service)
- AWS Lambda

## Standalone LocalStack

This directory includes a standalone setup for LocalStack, which allows you to run and test AWS services independently from the rest of the application.

### Files

- `Dockerfile`: Custom Dockerfile for LocalStack
- `docker-compose.yml`: Docker Compose configuration for standalone LocalStack
- `init-aws.sh`: Initialization script for AWS resources
- `run-localstack.sh`: Helper script for managing LocalStack
- `.env.example`: Example environment variables for LocalStack

## Getting Started

### Prerequisites

- Docker and Docker Compose
- AWS CLI (for interacting with LocalStack)

### Running LocalStack Independently

1. Make sure you're in the `localstack` directory:
   ```bash
   cd localstack
   ```

2. Create a `.env` file from the example:
   ```bash
   cp .env.example .env
   ```

3. Use the helper script to start LocalStack:
   ```bash
   ./run-localstack.sh start
   ```

4. Initialize AWS resources:
   ```bash
   ./run-localstack.sh init
   ```

5. Check that resources were created:
   ```bash
   ./run-localstack.sh list
   ```

### Helper Script Commands

The `run-localstack.sh` script provides several commands:

- `start`: Start LocalStack
- `stop`: Stop LocalStack
- `restart`: Restart LocalStack
- `logs`: Show LocalStack logs
- `init`: Initialize AWS resources
- `list`: List AWS resources
- `help`: Show help message

Example:
```bash
./run-localstack.sh logs
```

## AWS Resources

The following AWS resources are created by the initialization script:

### SNS Topics
- `notification-events`: Main topic for notification events
- `notification-dlq`: Dead-letter queue topic

### SQS Queues
- `notification-queue`: Main queue for processing notifications
- `notification-dlq`: Dead-letter queue for failed notifications

### KMS Keys
- A KMS key for encryption/decryption of notification payloads

## Interacting with LocalStack

You can interact with LocalStack using the AWS CLI with the `--endpoint-url` parameter:

```bash
# List SNS topics
aws --endpoint-url=http://localhost:4566 sns list-topics

# List SQS queues
aws --endpoint-url=http://localhost:4566 sqs list-queues

# List KMS keys
aws --endpoint-url=http://localhost:4566 kms list-keys
```

## Troubleshooting

### Common Issues

1. **LocalStack not starting**:
   - Check Docker is running
   - Check for port conflicts on 4566
   - Check the logs: `./run-localstack.sh logs`

2. **AWS resources not created**:
   - Make sure LocalStack is running
   - Check the initialization script: `cat init-aws.sh`
   - Run the initialization manually: `./run-localstack.sh init`

3. **Connection issues from application**:
   - Verify LocalStack is running: `docker ps`
   - Check the endpoint URL is correct: `http://localhost:4566`
   - Ensure AWS credentials are set (even dummy ones)

## Integration with Main Application

When running the full application stack with Docker Compose, LocalStack is included as a service. The standalone setup described here is useful for:

- Testing AWS services in isolation
- Debugging AWS-related issues
- Developing AWS integrations without running the full stack 