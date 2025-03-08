# Lambda Deployment Scripts

This directory contains TypeScript-based deployment scripts for the Notification Service Lambda function. The scripts handle the creation and management of AWS Lambda functions, layers, IAM roles, and event source mappings.

## Features

- 🚀 Automated Lambda function deployment
- 📦 Lambda layer management for dependencies
- 🔐 IAM role and policy configuration
- 🔄 SQS event source mapping
- 🌟 Environment-specific configurations
- 📝 Detailed logging and error handling

## Prerequisites

- Node.js 18.x or later
- AWS CLI configured with appropriate credentials
- TypeScript 4.9+
- Access to AWS services (Lambda, IAM, SQS)

## Installation

1. Install dependencies:
```bash
cd scripts/deploy
npm install
```

2. Copy the environment example file and update it with your values:
```bash
cp .env.example .env
```

3. Update the `.env` file with your AWS credentials and configuration:
```env
AWS_PROFILE=your-aws-profile
AWS_REGION=us-east-1
...
```

## Usage

### Basic Deployment

Deploy to the development environment:
```bash
npm run deploy -- -e dev
```

### Advanced Options

```bash
npm run deploy -- [OPTIONS]

Options:
  -e, --environment     Deployment environment (dev|staging|prod) [default: dev]
  -r, --region         AWS region [default: us-east-1]
  -p, --profile        AWS profile [default: default]
  -m, --memory         Lambda memory size in MB [default: 256]
  -t, --timeout        Lambda timeout in seconds [default: 30]
  -h, --help           Display this help message
```

### Examples

Deploy to production in a specific region:
```bash
npm run deploy -- -e prod -r us-west-2
```

Deploy with custom memory and timeout:
```bash
npm run deploy -- -e dev -m 512 -t 60
```

## Configuration

### Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| AWS_PROFILE | AWS CLI profile name | - |
| AWS_REGION | AWS region for deployment | us-east-1 |
| ENVIRONMENT | Deployment environment | dev |
| BASE_FUNCTION_NAME | Base name for Lambda function | notification-processor |
| MEMORY_SIZE | Lambda function memory (MB) | 256 |
| TIMEOUT | Lambda function timeout (seconds) | 30 |
| RUNTIME | Lambda runtime version | nodejs18.x |
| HANDLER | Lambda function handler path | dist/main.handler |
| SETUP_SQS_TRIGGER | Enable SQS trigger setup | false |
| SQS_QUEUE_ARN | ARN of SQS queue to trigger Lambda | - |
| LOG_LEVEL | Logging level (debug,info,warn,error) | info |

### AWS Permissions

The deployment process requires the following AWS permissions:

- `lambda:CreateFunction`
- `lambda:UpdateFunctionCode`
- `lambda:UpdateFunctionConfiguration`
- `lambda:PublishLayerVersion`
- `lambda:CreateEventSourceMapping`
- `iam:CreateRole`
- `iam:GetRole`
- `iam:AttachRolePolicy`
- `iam:CreatePolicy`

## Project Structure

```
deploy/
├── config/           # Configuration management
├── services/         # AWS service wrappers
├── utils/           # Utility functions
├── index.ts         # Main entry point
├── package.json     # Dependencies and scripts
└── tsconfig.json    # TypeScript configuration
```

## Troubleshooting

### Common Issues

1. **AWS Credentials Not Found**
   - Ensure AWS CLI is configured: `aws configure`
   - Check AWS profile exists: `aws configure list-profiles`

2. **Permission Denied**
   - Verify AWS credentials have required permissions
   - Check IAM user/role policies

3. **Layer Size Too Large**
   - Lambda layers have a size limit of 250MB
   - Try splitting dependencies into multiple layers

4. **Deployment Timeout**
   - Check AWS service status
   - Verify network connectivity
   - Increase deployment timeout in AWS SDK config

### Logs

Deployment logs are available in the console and include:
- Deployment progress
- AWS service responses
- Error details with stack traces
- Resource creation/update status

## Contributing

1. Follow TypeScript best practices
2. Add JSDoc comments for new functions
3. Update README for new features
4. Test deployment in all environments

## License

This project is proprietary and confidential. Unauthorized copying or distribution is prohibited. 