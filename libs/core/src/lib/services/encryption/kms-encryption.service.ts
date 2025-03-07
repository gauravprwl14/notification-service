import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  KMSClient,
  EncryptCommand,
  DecryptCommand,
  GenerateDataKeyCommand,
  ListKeysCommand,
} from '@aws-sdk/client-kms';
import { EncryptionContext, EncryptionService } from '../../interfaces';
import { retryConnection } from '../../utils';

/**
 * Implementation of the encryption service using AWS KMS
 */
@Injectable()
export class KmsEncryptionService implements EncryptionService, OnModuleInit {
  private kmsClient: KMSClient;
  private readonly logger = new Logger(KmsEncryptionService.name);

  /**
   * Constructor for KmsEncryptionService
   * @param configService NestJS config service for retrieving AWS configuration
   */
  constructor(private readonly configService: ConfigService) {
    // Get AWS configuration from environment variables
    const region = this.configService.get<string>('AWS_REGION');
    const endpoint = this.configService.get<string>('AWS_ENDPOINT');
    const accessKeyId = this.configService.get<string>('AWS_ACCESS_KEY_ID');
    const secretAccessKey = this.configService.get<string>(
      'AWS_SECRET_ACCESS_KEY',
    );

    // Validate required credentials
    if (!region || !accessKeyId || !secretAccessKey) {
      this.logger.error(
        'Missing AWS credentials. Please check your environment variables.',
      );
    }

    // Initialize the KMS client with configuration from environment variables
    this.kmsClient = new KMSClient({
      region,
      endpoint,
      credentials: {
        accessKeyId: accessKeyId || 'dummy',
        secretAccessKey: secretAccessKey || 'dummy',
      },
      // Add retry configuration
      maxAttempts: 5,
    });
  }

  /**
   * Initialize the service and verify connection
   */
  async onModuleInit(): Promise<void> {
    try {
      // Test the connection by listing keys
      await retryConnection(
        async () => {
          const command = new ListKeysCommand({});
          await this.kmsClient.send(command);
          this.logger.log('Successfully connected to AWS KMS');
          return true;
        },
        {
          maxRetries: 5,
          initialDelay: 2000,
          maxDelay: 10000,
          logger: this.logger,
          serviceName: 'AWS KMS',
        },
      );
    } catch (error) {
      this.logger.error(
        'Failed to connect to AWS KMS. Encryption services will not work.',
        error instanceof Error ? error.stack : undefined,
      );
    }
  }

  /**
   * Encrypt data using KMS
   * @param data The data to encrypt
   * @param keyId The KMS key ID to use for encryption
   * @param context The encryption context
   * @returns A promise that resolves to the encrypted data as a base64-encoded string
   * @example
   * const encryptedData = await encryptionService.encrypt(
   *   'sensitive data',
   *   'arn:aws:kms:us-east-1:123456789012:key/1234abcd-12ab-34cd-56ef-1234567890ab',
   *   { financialInstitutionId: 'acme-bank', appId: 'mobile-banking', environment: 'production' }
   * );
   */
  async encrypt(
    data: string | Buffer,
    keyId: string,
    context: EncryptionContext,
  ): Promise<string> {
    // Use the provided key ID or fall back to the environment variable
    const effectiveKeyId =
      keyId || this.configService.get<string>('KMS_KEY_ID');

    if (!effectiveKeyId) {
      throw new Error(
        'Missing KMS key ID. Please provide a key ID or set the KMS_KEY_ID environment variable.',
      );
    }

    // Convert data to Buffer if it's a string
    const dataBuffer = typeof data === 'string' ? Buffer.from(data) : data;

    // Create the encrypt command
    const command = new EncryptCommand({
      KeyId: effectiveKeyId,
      Plaintext: dataBuffer,
      EncryptionContext: context,
    });

    // Execute the command with retry
    const response = await retryConnection(
      async () => this.kmsClient.send(command),
      {
        maxRetries: 3,
        initialDelay: 1000,
        logger: this.logger,
        serviceName: 'AWS KMS Encrypt',
      },
    );

    // Convert the encrypted data to a base64-encoded string
    if (!response.CiphertextBlob) {
      throw new Error('Failed to encrypt data: No CiphertextBlob returned');
    }

    return Buffer.from(response.CiphertextBlob).toString('base64');
  }

  /**
   * Decrypt data using KMS
   * @param encryptedData The encrypted data to decrypt (base64-encoded)
   * @param context The encryption context (must match the context used for encryption)
   * @returns A promise that resolves to the decrypted data as a string
   * @example
   * const decryptedData = await encryptionService.decrypt(
   *   'AQICAHiWpC0eMDGjJJ4...',
   *   { financialInstitutionId: 'acme-bank', appId: 'mobile-banking', environment: 'production' }
   * );
   */
  async decrypt(
    encryptedData: string,
    context: EncryptionContext,
  ): Promise<string> {
    // Convert the base64-encoded string to a Buffer
    const dataBuffer = Buffer.from(encryptedData, 'base64');

    // Create the decrypt command
    const command = new DecryptCommand({
      CiphertextBlob: dataBuffer,
      EncryptionContext: context,
    });

    // Execute the command with retry
    const response = await retryConnection(
      async () => this.kmsClient.send(command),
      {
        maxRetries: 3,
        initialDelay: 1000,
        logger: this.logger,
        serviceName: 'AWS KMS Decrypt',
      },
    );

    // Convert the decrypted data to a string
    if (!response.Plaintext) {
      throw new Error('Failed to decrypt data: No Plaintext returned');
    }

    return Buffer.from(response.Plaintext).toString('utf-8');
  }

  /**
   * Generate a data key for client-side encryption
   * @param keyId The KMS key ID to use for generating the data key
   * @param context The encryption context
   * @returns A promise that resolves to the generated data key
   * @example
   * const dataKey = await encryptionService.generateDataKey(
   *   'arn:aws:kms:us-east-1:123456789012:key/1234abcd-12ab-34cd-56ef-1234567890ab',
   *   { financialInstitutionId: 'acme-bank', appId: 'mobile-banking', environment: 'production' }
   * );
   */
  async generateDataKey(
    keyId: string,
    context: EncryptionContext,
  ): Promise<{
    plaintextKey: Buffer;
    encryptedKey: Buffer;
  }> {
    // Use the provided key ID or fall back to the environment variable
    const effectiveKeyId =
      keyId || this.configService.get<string>('KMS_KEY_ID');

    if (!effectiveKeyId) {
      throw new Error(
        'Missing KMS key ID. Please provide a key ID or set the KMS_KEY_ID environment variable.',
      );
    }

    // Create the generate data key command
    const command = new GenerateDataKeyCommand({
      KeyId: effectiveKeyId,
      KeySpec: 'AES_256',
      EncryptionContext: context,
    });

    // Execute the command with retry
    const response = await retryConnection(
      async () => this.kmsClient.send(command),
      {
        maxRetries: 3,
        initialDelay: 1000,
        logger: this.logger,
        serviceName: 'AWS KMS GenerateDataKey',
      },
    );

    // Check if the response contains the required data
    if (!response.Plaintext || !response.CiphertextBlob) {
      throw new Error(
        'Failed to generate data key: Missing Plaintext or CiphertextBlob',
      );
    }

    // Return the plaintext and encrypted data keys
    return {
      plaintextKey: Buffer.from(response.Plaintext),
      encryptedKey: Buffer.from(response.CiphertextBlob),
    };
  }
}
