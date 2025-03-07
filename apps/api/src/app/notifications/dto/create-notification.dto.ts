import { ApiProperty } from '@nestjs/swagger';
import {
  IsNotEmpty,
  IsString,
  IsUUID,
  IsISO8601,
  ValidateNested,
  IsOptional,
} from 'class-validator';
import { Type } from 'class-transformer';

/**
 * DTO for tenant information in notification requests
 */
export class TenantDto {
  @ApiProperty({
    description: 'Financial institution identifier',
    example: 'acme-bank',
  })
  @IsNotEmpty()
  @IsString()
  financialInstitutionId: string;

  @ApiProperty({
    description: 'Application identifier',
    example: 'mobile-banking',
  })
  @IsNotEmpty()
  @IsString()
  appId: string;

  @ApiProperty({
    description: 'Environment (dev, staging, production)',
    example: 'production',
  })
  @IsNotEmpty()
  @IsString()
  environment: string;
}

/**
 * DTO for creating a new notification
 */
export class CreateNotificationDto {
  @ApiProperty({
    description: 'Unique identifier for the event',
    example: '550e8400-e29b-41d4-a716-446655440000',
  })
  @IsUUID()
  id: string;

  @ApiProperty({
    description: 'Type of the notification event',
    example: 'transaction.completed',
  })
  @IsNotEmpty()
  @IsString()
  type: string;

  @ApiProperty({
    description: 'Version of the event schema',
    example: '1.0',
  })
  @IsNotEmpty()
  @IsString()
  version: string;

  @ApiProperty({
    description: 'Timestamp when the event was created (ISO format)',
    example: '2023-01-01T12:00:00Z',
  })
  @IsISO8601()
  timestamp: string;

  @ApiProperty({
    description: 'Source system that generated the event',
    example: 'mobile-banking-app',
  })
  @IsNotEmpty()
  @IsString()
  source: string;

  @ApiProperty({
    description: 'Tenant information',
  })
  @ValidateNested()
  @Type(() => TenantDto)
  tenant: TenantDto;

  @ApiProperty({
    description: 'Encrypted payload containing the notification data',
    example: 'AQICAHiWpC0eMDGjJJ4...',
  })
  @IsNotEmpty()
  @IsString()
  encryptedPayload: string;

  @ApiProperty({
    description: 'Optional metadata for the event',
    required: false,
  })
  @IsOptional()
  metadata?: Record<string, unknown>;
}
