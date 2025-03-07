import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { CoreModule } from '@notification-service/core';
import { HandlersModule } from './handlers/handlers.module';
import { ServicesModule } from './services/services.module';
import * as Joi from 'joi';

/**
 * Main Lambda processor module
 */
@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ['.env', 'apps/lambda-processor/.env'],
      validationSchema: Joi.object({
        NODE_ENV: Joi.string()
          .valid('development', 'production', 'test')
          .default('development'),
        PORT: Joi.number().default(3001),
        AWS_REGION: Joi.string().required(),
        AWS_ACCESS_KEY_ID: Joi.string().required(),
        AWS_SECRET_ACCESS_KEY: Joi.string().required(),
        AWS_ENDPOINT: Joi.string().optional(),
        SQS_QUEUE_URL: Joi.string().required(),
        SQS_DLQ_URL: Joi.string().required(),
        ADDITIONAL_SQS_QUEUES: Joi.string().optional().default(''),
        KMS_KEY_ID: Joi.string().required(),
        REDIS_HOST: Joi.string().required(),
        REDIS_PORT: Joi.number().default(6379),
        LOG_LEVEL: Joi.string()
          .valid('error', 'warn', 'info', 'debug', 'verbose')
          .default('info'),
      }),
    }),
    CoreModule,
    HandlersModule,
    ServicesModule,
  ],
})
export class AppModule {}
