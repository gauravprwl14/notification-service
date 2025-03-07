import {
  Controller,
  Post,
  Body,
  HttpStatus,
  HttpCode,
  Logger,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBody } from '@nestjs/swagger';
import { NotificationsService } from './notifications.service';
import { CreateNotificationDto } from './dto';

/**
 * Controller for handling notification requests
 */
@ApiTags('notifications')
@Controller('notifications')
export class NotificationsController {
  private readonly logger = new Logger(NotificationsController.name);

  /**
   * Constructor for NotificationsController
   * @param notificationsService Service for handling notifications
   */
  constructor(private readonly notificationsService: NotificationsService) {}

  /**
   * Create a new notification
   * @param createNotificationDto DTO containing notification data
   * @returns The result of the notification send operation
   */
  @Post()
  @HttpCode(HttpStatus.ACCEPTED)
  @ApiOperation({ summary: 'Create a new notification' })
  @ApiBody({ type: CreateNotificationDto })
  @ApiResponse({
    status: HttpStatus.ACCEPTED,
    description: 'The notification has been accepted for processing',
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Invalid notification data',
  })
  @ApiResponse({
    status: HttpStatus.UNAUTHORIZED,
    description: 'Unauthorized',
  })
  async create(@Body() createNotificationDto: CreateNotificationDto) {
    this.logger.debug(
      `Received notification request with ID ${createNotificationDto.id}`,
    );

    const result = await this.notificationsService.create(
      createNotificationDto,
    );

    return {
      success: result.success,
      messageId: result.messageId,
      timestamp: result.timestamp,
    };
  }
}
