import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  SQSClient,
  ReceiveMessageCommand,
  DeleteMessageCommand,
  Message,
  MessageAttributeValue,
} from '@aws-sdk/client-sqs';
import { NotificationHandler } from '../handlers/notification.handler';
import {
  SQSEvent,
  SQSRecord,
  SQSRecordAttributes,
  SQSMessageAttributes,
} from 'aws-lambda';

@Injectable()
export class SqsSubscriberService implements OnModuleInit {
  private readonly logger = new Logger(SqsSubscriberService.name);
  private sqsClient: SQSClient;
  private isDev: Boolean;
  private queueUrls: string[] = [];
  private isProcessing = false;

  constructor(
    private readonly configService: ConfigService,
    private readonly notificationHandler: NotificationHandler,
  ) {
    // Initialize SQS client
    const region = this.configService.getOrThrow<string>('AWS_REGION');
    const endpoint = this.configService.get<string>('AWS_ENDPOINT');
    this.isDev =
      this.configService.get<string>('NODE_ENV') === 'development' ||
      this.configService.get<string>('NODE_ENV') === 'dev';
    this.sqsClient = new SQSClient({
      region,
      endpoint,
      credentials: {
        accessKeyId:
          this.configService.get<string>('AWS_ACCESS_KEY_ID') || 'test',
        secretAccessKey:
          this.configService.get<string>('AWS_SECRET_ACCESS_KEY') || 'test',
      },
    });

    // Get queue URLs
    const mainQueueUrl = this.configService.getOrThrow<string>('SQS_QUEUE_URL');
    const additionalQueues = this.configService.get<string>(
      'ADDITIONAL_SQS_QUEUES',
      '',
    );

    this.queueUrls = [mainQueueUrl];
    if (additionalQueues) {
      this.queueUrls.push(...additionalQueues.split(','));
    }
  }

  async onModuleInit() {
    this.logger.log(
      `Initializing SQS subscriber for queues: ${this.queueUrls.join(', ')}`,
    );
    this.startProcessing();
  }

  private async startProcessing() {
    if (this.isProcessing) return;
    this.isProcessing = true;

    if (this.isDev) {
      while (this.isProcessing) {
        await this.pollQueues();
        // Add a small delay to prevent tight polling
        await new Promise((resolve) => setTimeout(resolve, 100));
      }
    }
  }

  private async pollQueues() {
    await Promise.all(
      this.queueUrls.map((queueUrl) => this.pollQueue(queueUrl)),
    );
  }

  /**
   * Convert AWS SDK MessageAttributeValue to SQS MessageAttributes format
   */
  private convertMessageAttributes(
    messageAttributes: Record<string, MessageAttributeValue> = {},
  ): SQSMessageAttributes {
    const converted: SQSMessageAttributes = {};

    for (const [key, value] of Object.entries(messageAttributes)) {
      if (value.DataType) {
        converted[key] = {
          dataType: value.DataType,
          stringValue: value.StringValue,
          // Convert binary value to base64 string if present
          binaryValue: value.BinaryValue
            ? Buffer.from(value.BinaryValue).toString('base64')
            : undefined,
        };
      }
    }

    return converted;
  }

  /**
   * Convert AWS SQS Message to SQSRecord format
   */
  private convertToSQSRecord(message: Message, queueUrl: string): SQSRecord {
    // Convert message attributes to the expected format
    const messageAttributes = this.convertMessageAttributes(
      message.MessageAttributes,
    );

    // Create the required SQS attributes
    const attributes: SQSRecordAttributes = {
      ApproximateReceiveCount: '1',
      SentTimestamp: message.Attributes?.SentTimestamp || Date.now().toString(),
      SenderId: message.Attributes?.SenderId || 'local-sender',
      ApproximateFirstReceiveTimestamp:
        message.Attributes?.ApproximateFirstReceiveTimestamp ||
        Date.now().toString(),
    };

    return {
      messageId: message.MessageId || 'default-id',
      receiptHandle: message.ReceiptHandle || '',
      body: message.Body || '',
      attributes,
      messageAttributes,
      md5OfBody: message.MD5OfBody || '',
      eventSource: 'aws:sqs',
      eventSourceARN: queueUrl,
      awsRegion: this.configService.getOrThrow<string>('AWS_REGION'),
    };
  }

  private async pollQueue(queueUrl: string) {
    try {
      const command = new ReceiveMessageCommand({
        QueueUrl: queueUrl,
        MaxNumberOfMessages: 10,
        WaitTimeSeconds: 20, // Long polling
        MessageAttributeNames: ['All'],
        AttributeNames: ['All'], // Request all system attributes
      });

      const response = await this.sqsClient.send(command);

      if (response.Messages && response.Messages.length > 0) {
        this.logger.debug(
          `Received ${response.Messages.length} messages from ${queueUrl}`,
        );

        for (const message of response.Messages) {
          try {
            // Convert the message to SQSRecord format
            const sqsRecord = this.convertToSQSRecord(message, queueUrl);

            // Create the SQSEvent
            const sqsEvent: SQSEvent = {
              Records: [sqsRecord],
            };

            // Process the message
            await this.notificationHandler.processSqsEvent(sqsEvent);

            // Delete the message after successful processing
            await this.sqsClient.send(
              new DeleteMessageCommand({
                QueueUrl: queueUrl,
                ReceiptHandle: message.ReceiptHandle,
              }),
            );
          } catch (error) {
            this.logger.error(
              `Error processing message ${message.MessageId} from ${queueUrl}:`,
              error instanceof Error ? error.stack : undefined,
            );
          }
        }
      }
    } catch (error) {
      this.logger.error(
        `Error polling queue ${queueUrl}:`,
        error instanceof Error ? error.stack : undefined,
      );
    }
  }

  async stopProcessing() {
    this.isProcessing = false;
  }
}
