import {
  Controller,
  Post,
  Body,
  HttpStatus,
  HttpCode,
  Logger,
  HttpException,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBody,
  ApiExtraModels,
} from '@nestjs/swagger';
import { NotificationsService } from './notifications.service';
import { NotificationEvent } from '@notification-service/core';
import { ValidationService } from '@notification-service/core';
import { ErrorResponseDto } from '@notification-service/core';
import { notificationExample } from './swagger/examples/notification.example';
import { notificationEventSchema } from './swagger/schemas/notification.schema';
import {
  notificationSuccessResponseSchema,
  notificationErrorResponseSchema,
  unauthorizedResponseSchema,
} from './swagger/responses/notification.response';

/**
 * Controller for handling notification requests
 */
@ApiTags('notifications')
@Controller('notifications')
@ApiExtraModels(ErrorResponseDto)
export class NotificationsController {
  private readonly logger = new Logger(NotificationsController.name);

  /**
   * Constructor for NotificationsController
   * @param notificationsService Service for handling notifications
   * @param validationService Service for validating events
   */
  constructor(
    private readonly notificationsService: NotificationsService,
    private readonly validationService: ValidationService,
  ) {}

  /**
   * Create a new notification
   * @param event The notification event
   * @returns The result of the notification send operation
   */
  @Post()
  @HttpCode(HttpStatus.ACCEPTED)
  @ApiOperation({
    summary: 'Create a new notification',
    description: `
      Creates and sends a new notification event through the configured provider (SNS/SQS).
      The event must follow the specified schema and include all required fields.
      
      ## Event Structure
      - \`id\`: Unique identifier for the event (UUID v4)
      - \`header\`: Contains event metadata and routing information
      - \`payload\`: Contains the actual notification data and context
      
      ## Validation
      The event will be validated against the schema before processing.
      All required fields must be present and properly formatted.
      
      ## Response
      Returns a 202 Accepted response with the message ID if successful.
      If validation fails, returns a 400 Bad Request with error details.
    `,
  })
  @ApiBody({
    type: Object,
    description: 'The notification event to be sent',
    required: true,
    schema: notificationEventSchema,
    examples: {
      notificationExample: {
        value: notificationExample,
        description: 'Example of a valid notification event',
      },
    },
  })
  @ApiResponse({
    status: HttpStatus.ACCEPTED,
    description: 'The notification has been accepted for processing',
    schema: notificationSuccessResponseSchema,
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Invalid notification data',
    schema: notificationErrorResponseSchema,
  })
  @ApiResponse({
    status: HttpStatus.UNAUTHORIZED,
    description: 'Unauthorized - Invalid or missing API key',
    schema: unauthorizedResponseSchema,
  })
  async create(@Body() event: NotificationEvent<Record<string, unknown>>) {
    this.logger.debug(
      `Received notification event: ${JSON.stringify(event, null, 2)}`,
    );

    // Validate the event
    const validationErrors = this.validationService.validateEvent(event);

    if (validationErrors.length > 0) {
      throw new HttpException(
        { errors: validationErrors },
        HttpStatus.BAD_REQUEST,
      );
    }

    // Process the event
    const result = await this.notificationsService.processEvent(event);

    return {
      success: result.success,
      messageId: result.messageId,
      timestamp: result.timestamp,
    };
  }
}
