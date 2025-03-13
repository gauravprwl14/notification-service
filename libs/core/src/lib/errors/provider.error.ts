import { BaseError } from './base.error';
import { ErrorCategory, ErrorType } from './error.interface';

export enum ProviderErrorCode {
  CONFIG_MISSING = 'PROVIDER_001',
  CONNECTION_FAILED = 'PROVIDER_002',
  OPERATION_FAILED = 'PROVIDER_003',
  INITIALIZATION_FAILED = 'PROVIDER_004',
}

export class ProviderError extends BaseError {
  constructor(params: {
    message: string;
    errorCode: ProviderErrorCode;
    data?: Record<string, unknown>;
    originalError?: Error;
    requestId?: string;
  }) {
    super({
      ...params,
      errorType: ErrorType.TECHNICAL,
      errorCategory: ErrorCategory.SYSTEM,
      messageKey: `error.provider.${params.errorCode.toLowerCase()}`,
    });
  }

  static configMissing(
    configKey: string,
    providerName: string,
    requestId?: string,
  ): ProviderError {
    return new ProviderError({
      message: `Missing ${configKey} for provider ${providerName}`,
      errorCode: ProviderErrorCode.CONFIG_MISSING,
      data: { configKey, providerName },
      requestId,
    });
  }

  static connectionFailed(
    providerName: string,
    originalError?: Error,
    requestId?: string,
  ): ProviderError {
    return new ProviderError({
      message: `Failed to connect to provider ${providerName}`,
      errorCode: ProviderErrorCode.CONNECTION_FAILED,
      data: { providerName },
      originalError,
      requestId,
    });
  }

  static operationFailed(
    operation: string,
    providerName: string,
    originalError?: Error,
    requestId?: string,
  ): ProviderError {
    return new ProviderError({
      message: `Failed to perform ${operation} on provider ${providerName}`,
      errorCode: ProviderErrorCode.OPERATION_FAILED,
      data: { operation, providerName },
      originalError,
      requestId,
    });
  }
}
