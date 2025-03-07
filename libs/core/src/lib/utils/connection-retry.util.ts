import { Logger } from '@nestjs/common';

/**
 * Options for connection retry
 */
export interface RetryOptions {
  /**
   * Maximum number of retry attempts
   * @default 5
   */
  maxRetries?: number;

  /**
   * Initial delay in milliseconds
   * @default 1000
   */
  initialDelay?: number;

  /**
   * Maximum delay in milliseconds
   * @default 30000
   */
  maxDelay?: number;

  /**
   * Factor by which the delay increases with each retry
   * @default 2
   */
  backoffFactor?: number;

  /**
   * Logger instance
   */
  logger?: Logger;

  /**
   * Service name for logging
   */
  serviceName?: string;
}

/**
 * Retry a connection with exponential backoff
 * @param connectFn Function that attempts to establish a connection
 * @param options Retry options
 * @returns A promise that resolves when the connection is established
 * @throws Error if the connection fails after all retry attempts
 * @example
 * const redisClient = await retryConnection(
 *   async () => {
 *     const client = createClient({ url: `redis://${host}:${port}` });
 *     await client.connect();
 *     return client;
 *   },
 *   { serviceName: 'Redis', logger: this.logger }
 * );
 */
export async function retryConnection<T>(
  connectFn: () => Promise<T>,
  options: RetryOptions = {},
): Promise<T> {
  const {
    maxRetries = 5,
    initialDelay = 1000,
    maxDelay = 30000,
    backoffFactor = 2,
    logger,
    serviceName = 'Service',
  } = options;

  let currentDelay = initialDelay;
  let attempts = 0;

  while (attempts < maxRetries) {
    try {
      return await connectFn();
    } catch (error) {
      attempts++;

      if (attempts >= maxRetries) {
        const errorMessage = `Failed to connect to ${serviceName} after ${maxRetries} attempts`;
        if (logger) {
          logger.error(
            errorMessage,
            error instanceof Error ? error.stack : undefined,
          );
        }
        throw new Error(errorMessage);
      }

      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';
      if (logger) {
        logger.warn(
          `Connection to ${serviceName} failed (attempt ${attempts}/${maxRetries}): ${errorMessage}. Retrying in ${currentDelay}ms...`,
        );
      }

      // Wait for the current delay before retrying
      await new Promise((resolve) => setTimeout(resolve, currentDelay));

      // Increase the delay for the next attempt (with a maximum limit)
      currentDelay = Math.min(currentDelay * backoffFactor, maxDelay);
    }
  }

  // This should never be reached due to the throw in the loop
  throw new Error(`Failed to connect to ${serviceName}`);
}
