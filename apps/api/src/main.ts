/**
 * This is not a production server yet!
 * This is only a minimal backend to get started.
 */

import { Logger, ValidationPipe, VersioningType } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { AppModule } from './app/app.module';
import { ConfigService } from '@nestjs/config';
import { CreateNotificationDto } from './app/notifications/dto/create-notification.dto';

/**
 * Bootstrap the application
 */
async function bootstrap() {
  // Create the NestJS application
  const app = await NestFactory.create(AppModule);
  const configService = app.get(ConfigService);
  const port = configService.get('port');

  // Configure API versioning and global prefix
  const globalPrefix = 'api';
  app.enableVersioning({
    type: VersioningType.URI,
    defaultVersion: '1',
  });
  app.setGlobalPrefix(globalPrefix);

  // Configure validation
  app.useGlobalPipes(
    new ValidationPipe({
      transform: true,
      whitelist: true,
      forbidNonWhitelisted: true,
    }),
  );

  // Configure CORS
  app.enableCors({
    origin: '*',
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE',
    preflightContinue: false,
    optionsSuccessStatus: 204,
  });

  // Configure Swagger
  const config = new DocumentBuilder()
    .setTitle('Notification Service API')
    .setDescription(
      `
      REST API for sending notifications through various providers.
      
      ## Features
      - Send notifications via AWS SNS/SQS
      - Support for multiple notification types
      - Event-driven architecture
      - Configurable providers
      
      ## Authentication
      All endpoints require proper authentication. Please include your API key in the headers.
      
      ## Rate Limiting
      API calls are limited to 1000 requests per minute per API key.
    `,
    )
    .setVersion('1.0')
    .addTag('notifications', 'Notification management endpoints')
    .addBearerAuth()
    .addApiKey()
    .setContact(
      'API Support',
      'https://tyfone.com/support',
      'support@tyfone.com',
    )
    .setLicense('Private', 'https://tyfone.com/terms')
    .build();

  const document = SwaggerModule.createDocument(app, config, {
    extraModels: [CreateNotificationDto],
    deepScanRoutes: true,
  });
  SwaggerModule.setup('docs', app, document, {
    swaggerOptions: {
      persistAuthorization: true,
      tagsSorter: 'alpha',
      operationsSorter: 'alpha',
    },
  });

  // Start the server
  await app.listen(port);

  Logger.log(
    `🚀 Application is running on: http://localhost:${port}/${globalPrefix}/v1`,
  );
  Logger.log(
    `📚 Swagger documentation is available at: http://localhost:${port}/docs`,
  );
}

bootstrap();
