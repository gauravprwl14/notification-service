import { Injectable, Logger } from '@nestjs/common';
import {
  INotificationProvider,
  NotificationProviderConfig,
} from '../interfaces/notification-provider.interface';
import { AwsSnsProvider } from '../providers/aws-sns.provider';

/**
 * Enum for supported notification provider types
 */
export enum NotificationProviderType {
  AWS_SNS = 'AWS_SNS',
  // Add more providers as needed
}

/**
 * Factory for creating notification providers
 */
@Injectable()
export class NotificationProviderFactory {
  private readonly logger = new Logger(NotificationProviderFactory.name);
  private readonly providers = new Map<string, INotificationProvider>();

  constructor(private readonly awsSnsProvider: AwsSnsProvider) {}

  /**
   * Get or create a provider instance
   * @param type Provider type
   * @param config Provider configuration
   * @returns Promise resolving to the provider instance
   */
  async getProvider(
    type: NotificationProviderType,
    config: NotificationProviderConfig,
  ): Promise<INotificationProvider> {
    // Check if provider instance exists
    const existingProvider = this.providers.get(type);
    if (existingProvider) {
      return existingProvider;
    }

    // Create new provider instance
    let provider: INotificationProvider;

    switch (type) {
      case NotificationProviderType.AWS_SNS:
        provider = this.awsSnsProvider;
        break;
      default:
        throw new Error(`Unsupported provider type: ${type}`);
    }

    // Initialize the provider
    await provider.initialize(config);

    // Cache the provider instance
    this.providers.set(type, provider);
    this.logger.log(
      `Created new provider instance: ${provider.getProviderName()}`,
    );

    return provider;
  }
}
