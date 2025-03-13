// Export interfaces and types
export * from './lib/interfaces/event.interface';
export * from './lib/interfaces/provider.interface';
export * from './lib/interfaces/encryption.interface';
export * from './lib/errors/error.interface';

// Export DTOs
export * from './lib/dto/error-response.dto';

// Export error classes
export * from './lib/errors/base.error';
export * from './lib/errors/notification.error';
export * from './lib/errors/provider.error';

// Export services
export * from './lib/validation/validation.service';
export * from './lib/core.module';

// Validation
export * from './lib/validation/schemas/event.schema';

// Remove potentially conflicting exports
// export * from './lib/interfaces';
export * from './lib/constants';
export * from './lib/services';
export * from './lib/utils';
