/**
 * This is not a production server yet!
 * This is only a minimal backend to get started.
 */

import { NestFactory } from '@nestjs/core';
import { Logger } from '@nestjs/common';
import { SQSEvent, Context, Handler } from 'aws-lambda';
import { AppModule } from './app/app.module';
import { NotificationHandler } from './app/handlers/notification.handler';

/**
 * Lambda handler for processing SQS events
 * @param event The SQS event from Lambda
 * @param context The Lambda context
 * @returns A promise that resolves when processing is complete
 */
export const handler: Handler = async (event: SQSEvent, context: Context) => {
  Logger.debug(
    `Lambda function invoked with request ID: ${context.awsRequestId}`,
  );

  try {
    // Create a NestJS application context
    const app = await NestFactory.createApplicationContext(AppModule);

    // Get the notification handler from the application context
    const notificationHandler = app.get(NotificationHandler);

    // Process the SQS event
    await notificationHandler.processSqsEvent(event);

    // Close the application context
    await app.close();

    Logger.debug('Lambda function completed successfully');
    return {
      statusCode: 200,
      body: JSON.stringify({
        message: 'Event processed successfully',
      }),
    };
  } catch (error: unknown) {
    // Type guard for error object
    const errorMessage =
      error instanceof Error ? error.message : 'Unknown error';
    const errorStack = error instanceof Error ? error.stack : undefined;

    Logger.error(`Lambda function failed: ${errorMessage}`, errorStack);

    return {
      statusCode: 500,
      body: JSON.stringify({
        message: 'Error processing event',
        error: errorMessage,
      }),
    };
  }
};

/**
 * Bootstrap the application for local development
 */
async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const port = process.env.PORT || 3001;
  await app.listen(port);
  Logger.log(`🚀 Lambda processor is running on: http://localhost:${port}`);
}

// Only call bootstrap in development mode
if (process.env.NODE_ENV !== 'production') {
  bootstrap();
}
