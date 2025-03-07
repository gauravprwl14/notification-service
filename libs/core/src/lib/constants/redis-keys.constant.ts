/**
 * Constants for Redis keys
 * These are used to store and retrieve data from Redis
 */
export const REDIS_KEYS = {
  /**
   * Prefix for tenant configuration keys
   * @example "tenant:acme-bank:mobile-banking:production"
   */
  TENANT_CONFIG_PREFIX: 'tenant',

  /**
   * Prefix for schema registry keys
   * @example "schema:transaction.completed:1.0"
   */
  SCHEMA_REGISTRY_PREFIX: 'schema',

  /**
   * Prefix for rate limiting keys
   * @example "rate-limit:acme-bank:mobile-banking:production"
   */
  RATE_LIMIT_PREFIX: 'rate-limit',

  /**
   * Channel for tenant configuration updates
   */
  TENANT_CONFIG_CHANNEL: 'tenant-config-updates',

  /**
   * Channel for schema registry updates
   */
  SCHEMA_REGISTRY_CHANNEL: 'schema-registry-updates',
};
