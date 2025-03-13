# Development Setup Guide

## Prerequisites

### Required Software
- Node.js (v18 or later)
- npm (v9 or later)
- Docker (v20 or later)
- AWS CLI (v2 or later)

### AWS Account Setup
1. Create an AWS account or use existing credentials
2. Configure AWS CLI with appropriate permissions:
   ```bash
   aws configure
   ```

## Local Development Setup

### 1. Clone the Repository
```bash
git clone <repository-url>
cd notification-service
```

### 2. Install Dependencies
```bash
npm install
```

### 3. Environment Configuration
1. Copy the example environment file:
   ```bash
   cp .env.example .env
   ```

2. Update the following variables in `.env`:
   ```env
   # Application
   NODE_ENV=development
   PORT=3000

   # Notification Provider
   NOTIFICATION_PROVIDER=sns

   # AWS Configuration
   AWS_REGION=us-east-1
   AWS_ACCESS_KEY_ID=your-access-key
   AWS_SECRET_ACCESS_KEY=your-secret-key
   # For local development with LocalStack
   AWS_ENDPOINT=http://localhost:4566

   # SNS Topics
   SNS_TOPIC_APPLICATION_UPDATE=arn:aws:sns:us-east-1:000000000000:application-update
   SNS_TOPIC_APPLICATION_CREATE=arn:aws:sns:us-east-1:000000000000:application-create
   SNS_TOPIC_USER_UPDATE=arn:aws:sns:us-east-1:000000000000:user-update
   ```

### 4. Local Infrastructure Setup

#### Using LocalStack
1. Start LocalStack:
   ```bash
   docker-compose up -d localstack
   ```

2. Create required SNS topics:
   ```bash
   # Create topics
   aws --endpoint-url=http://localhost:4566 sns create-topic --name application-update
   aws --endpoint-url=http://localhost:4566 sns create-topic --name application-create
   aws --endpoint-url=http://localhost:4566 sns create-topic --name user-update

   # List topics
   aws --endpoint-url=http://localhost:4566 sns list-topics
   ```

### 5. Start Development Server
```bash
# Start in development mode with hot reload
npm run start:dev

# Start in debug mode
npm run start:debug
```

### 6. Verify Setup
1. Check if the server is running:
   ```bash
   curl http://localhost:3000/api/v1/health
   ```

2. View Swagger documentation:
   ```
   http://localhost:3000/docs
   ```

## Development Workflow

### Code Structure
```
notification-service/
├── apps/
│   └── api/
│       ├── src/
│       │   ├── app/
│       │   │   ├── notifications/
│       │   │   └── health/
│       │   └── main.ts
│       └── test/
├── libs/
│   ├── core/
│   └── provider-adapters/
├── docs/
└── package.json
```

### Running Tests
```bash
# Run unit tests
npm run test

# Run e2e tests
npm run test:e2e

# Run tests with coverage
npm run test:cov
```

### Linting and Formatting
```bash
# Run linter
npm run lint

# Fix linting issues
npm run lint:fix

# Format code
npm run format
```

### Building
```bash
# Build the application
npm run build

# Build for production
npm run build:prod
```

## Debugging

### VS Code Configuration
1. Create `.vscode/launch.json`:
```json
{
  "version": "0.2.0",
  "configurations": [
    {
      "type": "node",
      "request": "launch",
      "name": "Debug NestJS",
      "runtimeExecutable": "npm",
      "runtimeArgs": ["run", "start:debug"],
      "console": "integratedTerminal",
      "restart": true,
      "protocol": "inspector",
      "port": 9229,
      "autoAttachChildProcesses": true
    }
  ]
}
```

2. Add breakpoints in your code
3. Press F5 to start debugging

### Common Issues

#### AWS Connectivity
If you can't connect to LocalStack:
1. Check if LocalStack is running:
   ```bash
   docker ps
   ```
2. Verify AWS endpoint configuration
3. Check AWS credentials

#### SNS Topics
If notifications aren't being sent:
1. Verify topic ARNs in `.env`
2. Check topic existence:
   ```bash
   aws --endpoint-url=http://localhost:4566 sns list-topics
   ```
3. Test topic publishing:
   ```bash
   aws --endpoint-url=http://localhost:4566 sns publish \
     --topic-arn arn:aws:sns:us-east-1:000000000000:application-update \
     --message "test message"
   ```

## Best Practices

### Code Style
1. Follow TypeScript best practices
2. Use meaningful variable names
3. Add JSDoc comments for functions
4. Keep functions small and focused

### Testing
1. Write unit tests for business logic
2. Add integration tests for providers
3. Use mocks for external services
4. Maintain high test coverage

### Git Workflow
1. Create feature branches
2. Write meaningful commit messages
3. Keep PRs focused and small
4. Update documentation

### Error Handling
1. Use custom error classes
2. Add proper error logging
3. Include error context
4. Handle edge cases

## Additional Resources
- [NestJS Documentation](https://docs.nestjs.com/)
- [AWS SDK Documentation](https://docs.aws.amazon.com/sdk-for-javascript/)
- [TypeScript Documentation](https://www.typescriptlang.org/docs/) 