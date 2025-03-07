/**
 * Enum for notification provider types
 */
export enum ProviderType {
  /**
   * AWS SNS provider
   */
  SNS = 'sns',

  /**
   * AWS SQS provider
   */
  SQS = 'sqs',

  /**
   * Email provider
   */
  EMAIL = 'email',

  /**
   * SMS provider
   */
  SMS = 'sms',

  /**
   * Push notification provider
   */
  PUSH = 'push',
}
