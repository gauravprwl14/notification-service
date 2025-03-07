import { NotificationProviderConfig } from './notification-provider.interface';

/**
 * Interface for tenant identification
 */
export interface TenantIdentifier {
  /**
   * Financial institution identifier
   * @example "acme-bank"
   */
  financialInstitutionId: string;

  /**
   * Application identifier
   * @example "mobile-banking"
   */
  appId: string;

  /**
   * Environment (dev, staging, production)
   * @example "production"
   */
  environment: string;
}

/**
 * Interface for event routing configuration
 * Maps event types to provider IDs
 */
export interface EventRoutingConfig {
  /**
   * Event type pattern to match
   * Can be a specific event type or a wildcard pattern
   * @example "transaction.*" matches all transaction events
   */
  eventTypePattern: string;

  /**
   * Provider ID to route matching events to
   * @example "aws-sns-provider"
   */
  providerId: string;

  /**
   * Priority of this routing rule (lower number = higher priority)
   * @default 100
   */
  priority: number;
}

/**
 * Interface for tenant configuration
 */
export interface TenantConfig {
  /**
   * Tenant identifier
   */
  tenant: TenantIdentifier;

  /**
   * API key for authentication
   * @example "api-key-123456"
   */
  apiKey: string;

  /**
   * KMS key ID for encryption/decryption
   * @example "arn:aws:kms:us-east-1:123456789012:key/1234abcd-12ab-34cd-56ef-1234567890ab"
   */
  kmsKeyId: string;

  /**
   * Available notification providers for this tenant
   */
  providers: NotificationProviderConfig[];

  /**
   * Event routing configuration
   */
  eventRouting: EventRoutingConfig[];

  /**
   * Rate limiting configuration
   */
  rateLimiting: {
    /**
     * Maximum number of requests per minute
     * @default 1000
     */
    requestsPerMinute: number;

    /**
     * Maximum burst size
     * @default 100
     */
    burstSize: number;
  };

  /**
   * Whether this tenant is enabled
   * @default true
   */
  enabled: boolean;

  /**
   * Tenant-specific metadata
   */
  metadata?: Record<string, unknown>;
}
