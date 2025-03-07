import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { SnsProviderAdapter } from './sns';
import { SqsProviderAdapter } from './sqs';

/**
 * Provider adapters module providing notification provider implementations
 */
@Module({
  imports: [ConfigModule],
  providers: [SnsProviderAdapter, SqsProviderAdapter],
  exports: [SnsProviderAdapter, SqsProviderAdapter],
})
export class ProviderAdaptersModule {}
