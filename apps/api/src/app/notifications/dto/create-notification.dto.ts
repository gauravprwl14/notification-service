import { ApiProperty } from '@nestjs/swagger';
import {
  IsNotEmpty,
  IsString,
  IsUUID,
  IsISO8601,
  ValidateNested,
  IsOptional,
  IsObject,
} from 'class-validator';
import { Type } from 'class-transformer';

/**
 * DTO for tenant information in notification requests
 */
export class TenantDto {
  @ApiProperty({
    description: 'Financial institution identifier',
    example: 'fi_123',
  })
  @IsNotEmpty()
  @IsString()
  financialInstitutionId = '';

  @ApiProperty({
    description: 'Application identifier',
    example: 'app_123',
  })
  @IsNotEmpty()
  @IsString()
  appId = '';

  @ApiProperty({
    description: 'Environment (dev, staging, production)',
    example: 'production',
  })
  @IsNotEmpty()
  @IsString()
  environment = '';
}

/**
 * DTO for creating a new notification
 */
export class CreateNotificationDto {
  @ApiProperty({
    description: 'Unique identifier for the event',
    example: 'uuid-v4',
  })
  @IsUUID()
  id = '';

  @ApiProperty({
    description: 'Type of the notification event',
    example: 'user.created',
  })
  @IsNotEmpty()
  @IsString()
  type = '';

  @ApiProperty({
    description: 'Version of the event schema',
    example: '1.0.0',
  })
  @IsNotEmpty()
  @IsString()
  version = '';

  @ApiProperty({
    description: 'Timestamp when the event was created (ISO format)',
    example: '2024-01-01T00:00:00Z',
  })
  @IsISO8601()
  timestamp = new Date().toISOString();

  @ApiProperty({
    description: 'Source system that generated the event',
    example: 'user-service',
  })
  @IsNotEmpty()
  @IsString()
  source = '';

  @ApiProperty({
    description: 'Tenant information',
  })
  @ValidateNested()
  @Type(() => TenantDto)
  tenant = new TenantDto();

  @ApiProperty({
    description: 'Encrypted payload containing the notification data',
  })
  @IsNotEmpty()
  @IsString()
  encryptedPayload = '';

  @ApiProperty({
    description: 'Optional metadata for the event',
    required: false,
  })
  @IsOptional()
  @IsObject()
  metadata?: Record<string, unknown>;
}
