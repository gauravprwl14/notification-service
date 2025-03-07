import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { KmsEncryptionService } from './services/encryption';
import * as Joi from 'joi';

/**
 * Core module providing shared services and utilities
 */
@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      validationSchema: Joi.object({
        AWS_REGION: Joi.string().required(),
        AWS_ACCESS_KEY_ID: Joi.string().required(),
        AWS_SECRET_ACCESS_KEY: Joi.string().required(),
        AWS_ENDPOINT: Joi.string().optional(),
        KMS_KEY_ID: Joi.string().required(),
      }),
    }),
  ],
  providers: [
    {
      provide: 'ENCRYPTION_SERVICE',
      useClass: KmsEncryptionService,
    },
  ],
  exports: ['ENCRYPTION_SERVICE'],
})
export class CoreModule {}
