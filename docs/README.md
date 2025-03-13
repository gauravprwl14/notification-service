# Notification Service Documentation

## Overview
The Notification Service is a scalable, event-driven system designed to handle notifications through various providers (AWS SNS/SQS). It provides a unified interface for sending notifications while ensuring proper validation, error handling, and monitoring.

## Table of Contents

### Getting Started
- [Quick Start Guide](guides/setup/quick-start.md)
- [Development Setup](guides/setup/development-setup.md)
- [Environment Configuration](guides/setup/environment-config.md)

### Architecture
- [High-Level Architecture](architecture/high-level-architecture.md)
- [Sequence Diagrams](architecture/sequence-diagrams.md)
- [Data Flow](architecture/data-flow.md)
- [Security Architecture](architecture/security.md)

### API Documentation
- [API Overview](api/overview.md)
- [Authentication](api/authentication.md)
- [Endpoints](api/endpoints.md)
- [Error Handling](api/error-handling.md)
- [Rate Limiting](api/rate-limiting.md)

### Development Guides
- [Code Structure](guides/development/code-structure.md)
- [Adding New Providers](guides/development/adding-providers.md)
- [Testing Guide](guides/development/testing.md)
- [Error Handling Guide](guides/development/error-handling.md)

### Deployment
- [Deployment Guide](guides/deployment/deployment.md)
- [Infrastructure Setup](guides/deployment/infrastructure.md)
- [Monitoring](guides/deployment/monitoring.md)
- [Troubleshooting](guides/deployment/troubleshooting.md)

### Examples
- [Code Examples](examples/README.md)
- [Integration Examples](examples/integration/README.md)

### Reference
- [API Schemas](schemas/README.md)
- [Event Types](schemas/event-types.md)
- [Configuration Reference](schemas/configuration.md)

## Key Features
- Event-driven architecture
- Multiple provider support (SNS/SQS)
- Comprehensive validation
- Detailed error handling
- Scalable and maintainable design
- Swagger documentation
- TypeScript support

## Technology Stack
- NestJS framework
- TypeScript
- AWS SDK (SNS/SQS)
- OpenAPI/Swagger
- Jest for testing

## Contributing
Please read our [Contributing Guide](CONTRIBUTING.md) for details on our code of conduct and the process for submitting pull requests.

## License
This project is proprietary software owned by Tyfone Inc. 