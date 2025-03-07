import { registerAs } from '@nestjs/config';
import * as Joi from 'joi';

/**
 * Application configuration schema
 */
export const configValidationSchema = Joi.object({
  // AWS Configuration
  AWS_REGION: Joi.string().required(),
  AWS_ACCESS_KEY_ID: Joi.string().required(),
  AWS_SECRET_ACCESS_KEY: Joi.string().required(),

  // SQS Configuration
  SQS_QUEUE_URL: Joi.string().required(),
  SQS_DLQ_URL: Joi.string().required(),

  // KMS Configuration
  KMS_KEY_ID: Joi.string().required(),

  // Redis Configuration
  REDIS_HOST: Joi.string().required(),
  REDIS_PORT: Joi.number().default(6379),
  REDIS_PASSWORD: Joi.string().allow('').optional(),

  // Application Configuration
  NODE_ENV: Joi.string()
    .valid('development', 'production', 'test')
    .default('development'),
  LOG_LEVEL: Joi.string()
    .valid('debug', 'info', 'warn', 'error')
    .default('info'),
});

/**
 * AWS configuration
 */
export const awsConfig = registerAs('aws', () => ({
  region: process.env.AWS_REGION,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  },
  sqs: {
    queueUrl: process.env.SQS_QUEUE_URL,
    dlqUrl: process.env.SQS_DLQ_URL,
  },
  kms: {
    keyId: process.env.KMS_KEY_ID,
  },
}));

/**
 * Redis configuration
 */
export const redisConfig = registerAs('redis', () => ({
  host: process.env.REDIS_HOST,
  port: parseInt(process.env.REDIS_PORT || '6379', 10),
  password: process.env.REDIS_PASSWORD,
}));

/**
 * Application configuration
 */
export const appConfig = registerAs('app', () => ({
  nodeEnv: process.env.NODE_ENV || 'development',
  logLevel: process.env.LOG_LEVEL || 'info',
  isProduction: process.env.NODE_ENV === 'production',
}));

/**
 * Sample .env file content
 */
export const sampleEnvContent = `# AWS Configuration
AWS_REGION=us-east-1
AWS_ACCESS_KEY_ID=your-access-key
AWS_SECRET_ACCESS_KEY=your-secret-key

# SQS Configuration
SQS_QUEUE_URL=http://localhost:4566/000000000000/your-queue-name
SQS_DLQ_URL=http://localhost:4566/000000000000/your-dlq-name

# KMS Configuration
KMS_KEY_ID=your-kms-key-id

# Redis Configuration
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=

# Application Configuration
NODE_ENV=development
LOG_LEVEL=debug
`;
