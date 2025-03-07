/**
 * Constants for AWS resources
 * These are used to interact with AWS services
 */
export const AWS_RESOURCES = {
  /**
   * SNS topic for notification events
   */
  NOTIFICATION_EVENTS_TOPIC: 'notification-events',

  /**
   * SNS topic for dead-letter queue
   */
  NOTIFICATION_DLQ_TOPIC: 'notification-dlq',

  /**
   * SQS queue for notification processing
   */
  NOTIFICATION_QUEUE: 'notification-queue',

  /**
   * SQS queue for dead-letter queue
   */
  NOTIFICATION_DLQ_QUEUE: 'notification-dlq',

  /**
   * KMS key description for notification encryption
   */
  NOTIFICATION_KMS_KEY_DESCRIPTION: 'Notification Service Encryption Key',
};
