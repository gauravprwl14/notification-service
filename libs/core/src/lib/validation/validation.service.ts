import { Injectable, Logger } from '@nestjs/common';
import Ajv, { ValidateFunction } from 'ajv';
import addFormats from 'ajv-formats';
import { NotificationEvent } from '../interfaces/event.interface';
import { notificationEventSchema } from './schemas/event.schema';
import { ApplicationErrors, ErrorCode } from '../errors/error.constants';
import { ApplicationError } from '../errors/error.interface';

/**
 * Service for validating events using AJV
 */
@Injectable()
export class ValidationService {
  private readonly logger = new Logger(ValidationService.name);
  private readonly ajv: Ajv;
  private readonly validateNotificationEvent: ValidateFunction<NotificationEvent>;

  constructor() {
    this.ajv = new Ajv({
      allErrors: true,
      verbose: true,
      strict: true,
    });

    // Add formats like date-time
    addFormats(this.ajv);

    // Compile schemas
    this.validateNotificationEvent = this.ajv.compile(notificationEventSchema);
  }

  /**
   * Validate a notification event
   * @param event The event to validate
   * @returns Array of validation errors, empty if valid
   */
  validateEvent(event: unknown): ApplicationError[] {
    this.logger.debug('Validating notification event');

    const errors: ApplicationError[] = [];

    try {
      const isValid = this.validateNotificationEvent(event);

      if (!isValid) {
        this.logger.warn('Event validation failed', {
          errors: this.validateNotificationEvent.errors,
        });

        // Map AJV errors to application errors
        this.validateNotificationEvent.errors?.forEach((error) => {
          const applicationError = {
            ...ApplicationErrors[ErrorCode.EVENT_VALIDATION_FAILED],
            message: `${ApplicationErrors[ErrorCode.EVENT_VALIDATION_FAILED].message}: ${error.message}`,
            data: {
              path: error.instancePath,
              keyword: error.keyword,
              params: error.params,
            },
          };
          errors.push(applicationError);
        });
      }
    } catch (error) {
      this.logger.error('Error during event validation', error);
      errors.push(ApplicationErrors[ErrorCode.EVENT_VALIDATION_FAILED]);
    }

    return errors;
  }

  /**
   * Validate event header
   * @param event The event to validate
   * @returns Array of validation errors, empty if valid
   */
  validateEventHeader(event: unknown): ApplicationError[] {
    if (!event || typeof event !== 'object' || !('header' in event)) {
      return [ApplicationErrors[ErrorCode.INVALID_EVENT_HEADER]];
    }

    const errors: ApplicationError[] = [];
    const { header } = event as NotificationEvent;

    // Validate required fields
    if (!header.event_name) {
      errors.push({
        ...ApplicationErrors[ErrorCode.INVALID_EVENT_HEADER],
        message: 'Event name is required',
      });
    }

    // Add more specific header validations as needed

    return errors;
  }

  /**
   * Validate event payload
   * @param event The event to validate
   * @returns Array of validation errors, empty if valid
   */
  validateEventPayload(event: unknown): ApplicationError[] {
    if (!event || typeof event !== 'object' || !('payload' in event)) {
      return [ApplicationErrors[ErrorCode.INVALID_EVENT_PAYLOAD]];
    }

    const errors: ApplicationError[] = [];
    const { payload } = event as NotificationEvent;

    // Validate required fields
    if (!payload.metadata) {
      errors.push({
        ...ApplicationErrors[ErrorCode.INVALID_EVENT_PAYLOAD],
        message: 'Event metadata is required',
      });
    }

    if (!payload.data) {
      errors.push({
        ...ApplicationErrors[ErrorCode.INVALID_EVENT_PAYLOAD],
        message: 'Event data is required',
      });
    }

    // Add more specific payload validations as needed

    return errors;
  }
}
