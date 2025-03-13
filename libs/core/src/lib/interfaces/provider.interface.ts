import { NotificationEvent } from './event.interface';

export enum ProviderType {
  SNS = 'sns',
  SQS = 'sqs',
  EMAIL = 'email',
}

export interface NotificationProviderConfig {
  id: string;
  type: string;
  name: string;
  enabled: boolean;
  config: Record<string, unknown>;
}

export interface NotificationSendResult {
  success: boolean;
  messageId?: string;
  timestamp: string;
  error?: string;
  providerResponse?: Record<string, unknown>;
}

export interface NotificationProvider {
  getType(): string;
  send(
    event: NotificationEvent,
    config: NotificationProviderConfig,
  ): Promise<NotificationSendResult>;
}
