/**
 * Interface representing a notification event
 * This is the core data structure for all notifications in the system
 */
export interface NotificationEvent<T = unknown> {
  /**
   * Unique identifier for the event
   * @example "550e8400-e29b-41d4-a716-446655440000"
   */
  id: string;

  /**
   * Type of the notification event
   * @example "transaction.completed"
   */
  type: string;

  /**
   * Version of the event schema
   * @example "1.0"
   */
  version: string;

  /**
   * Timestamp when the event was created (ISO format)
   * @example "2023-01-01T12:00:00Z"
   */
  timestamp: string;

  /**
   * Source system that generated the event
   * @example "mobile-banking-app"
   */
  source: string;

  /**
   * Tenant information
   */
  tenant: {
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
  };

  /**
   * Encrypted payload containing the notification data
   * This is encrypted at the client side using AWS KMS
   * @example "AQICAHiWpC0eMDGjJJ4..."
   */
  encryptedPayload: string;

  /**
   * Optional metadata for the event
   */
  metadata?: Record<string, unknown>;
}
