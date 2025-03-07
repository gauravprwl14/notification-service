/**
 * Interface for encryption context
 * This is used to provide additional authenticated data for encryption/decryption
 */
export interface EncryptionContext {
  /**
   * Financial institution identifier
   * @example "acme-bank"
   */
  financialInstitutionId: string;

  /**
   * Application identifier
   * @example "mobile-banking"
   */
  appId: string;

  /**
   * Environment (dev, staging, production)
   * @example "production"
   */
  environment: string;

  /**
   * Additional context data
   */
  [key: string]: string;
}

/**
 * Interface for encryption service
 */
export interface EncryptionService {
  /**
   * Encrypt data using KMS
   * @param data The data to encrypt
   * @param keyId The KMS key ID to use for encryption
   * @param context The encryption context
   * @returns A promise that resolves to the encrypted data
   */
  encrypt(
    data: string | Buffer,
    keyId: string,
    context: EncryptionContext,
  ): Promise<string>;

  /**
   * Decrypt data using KMS
   * @param encryptedData The encrypted data to decrypt
   * @param context The encryption context (must match the context used for encryption)
   * @returns A promise that resolves to the decrypted data
   */
  decrypt(encryptedData: string, context: EncryptionContext): Promise<string>;

  /**
   * Generate a data key for client-side encryption
   * @param keyId The KMS key ID to use for generating the data key
   * @param context The encryption context
   * @returns A promise that resolves to the generated data key
   */
  generateDataKey(
    keyId: string,
    context: EncryptionContext,
  ): Promise<{
    /**
     * The plaintext data key (to be used for encryption)
     */
    plaintextKey: Buffer;

    /**
     * The encrypted data key (to be stored alongside the encrypted data)
     */
    encryptedKey: Buffer;
  }>;
}
