import { ApiProperty } from '@nestjs/swagger';
import {
  ApplicationError,
  ErrorType,
  ErrorCategory,
} from '../errors/error.interface';

export class ApplicationErrorDto implements ApplicationError {
  @ApiProperty()
  errorCode: string;

  @ApiProperty()
  message: string;

  @ApiProperty({ enum: ErrorType })
  errorType: ErrorType;

  @ApiProperty({ enum: ErrorCategory })
  errorCategory: ErrorCategory;

  @ApiProperty()
  messageKey: string;

  @ApiProperty({ required: false })
  data?: Record<string, unknown>;

  constructor(error: ApplicationError) {
    this.errorCode = error.errorCode;
    this.message = error.message;
    this.errorType = error.errorType;
    this.errorCategory = error.errorCategory;
    this.messageKey = error.messageKey;
    this.data = error.data;
  }
}

export class ErrorResponseDto {
  @ApiProperty({ type: [ApplicationErrorDto] })
  errors: ApplicationErrorDto[];

  constructor(errors: ApplicationErrorDto[]) {
    this.errors = errors;
  }
}
