import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as jwt from 'jsonwebtoken';
import * as fs from 'fs-extra';
import * as path from 'path';
import axios from 'axios';
import {
  SecretsManager,
  GetSecretValueCommandOutput,
} from '@aws-sdk/client-secrets-manager';

/**
 * Enum for private key source types
 */
// eslint-disable-next-line @typescript-eslint/no-unused-varss
export enum PrivateKeySourceType {
  FILE_PATH = 'FILE_PATH',
  ENV_VARIABLE = 'ENV_VARIABLE',
  AWS_SECRET = 'AWS_SECRET',
}

/**
 * Interface for private key configuration
 */
export interface PrivateKeyConfig {
  /**
   * Source type for the private key
   */
  sourceType: PrivateKeySourceType;

  /**
   * Value based on the source type:
   * - For FILE_PATH: absolute path to the private key file
   * - For ENV_VARIABLE: the private key content as a string
   * - For AWS_SECRET: the AWS Secrets Manager secret name
   */
  value: string;

  /**
   * Optional AWS region for AWS Secrets Manager
   * Only required when sourceType is AWS_SECRET
   */
  awsRegion?: string;
}

/**
 * Interface for Salesforce OAuth token response
 */
export interface SalesforceTokenResponse {
  /**
   * Access token for API calls
   */
  access_token: string;

  /**
   * OAuth scopes granted
   */
  scope: string;

  /**
   * Salesforce instance URL
   */
  instance_url: string;

  /**
   * Salesforce ID URL
   */
  id: string;

  /**
   * Token type (Bearer)
   */
  token_type: string;
}

/**
 * Service for handling Salesforce authentication using JWT OAuth flow
 */
@Injectable()
export class SalesforceAuthService {
  private readonly logger = new Logger(SalesforceAuthService.name);
  private accessToken: string | null = null;
  private instanceUrl: string | null = null;
  private tokenExpiry: Date | null = null;
  private readonly secretsManager: SecretsManager | null = null;

  /**
   * Constructor for SalesforceAuthService
   * @param configService NestJS config service for retrieving configuration
   */
  constructor(private readonly configService: ConfigService) {
    // Initialize AWS Secrets Manager if AWS region is configured
    const awsRegion = this.configService.get<string>('AWS_REGION');
    if (awsRegion) {
      this.secretsManager = new SecretsManager({ region: awsRegion });
    }
  }

  /**
   * Format the private key content to ensure proper PEM format
   * @param key The raw private key content
   * @returns Properly formatted private key
   * @private
   */
  private formatPrivateKey(key: string): string {
    // Remove any existing header and footer and all whitespace
    let cleanKey = key
      .replace(/-----BEGIN PRIVATE KEY-----/g, '')
      .replace(/-----END PRIVATE KEY-----/g, '')
      .replace(/[\n\r\s]/g, '');

    // Add proper line breaks (64 characters per line)
    const match = cleanKey.match(/.{1,64}/g);
    if (!match) {
      throw new Error('Invalid private key format');
    }
    cleanKey = match.join('\n');

    // Add header and footer with proper line breaks
    return `-----BEGIN PRIVATE KEY-----\n${cleanKey}\n-----END PRIVATE KEY-----\n`;
  }

  /**
   * Get the private key based on the configured source
   * @returns Promise<string> The private key content
   * @private
   */
  private async getPrivateKey(): Promise<string> {
    const sourceType = this.configService.get<PrivateKeySourceType>(
      'SALESFORCE_PRIVATE_KEY_SOURCE',
      PrivateKeySourceType.FILE_PATH,
    );

    let rawPrivateKey: string;

    try {
      switch (sourceType) {
        case PrivateKeySourceType.FILE_PATH: {
          const filePath = this.configService.get<string>(
            'SALESFORCE_PRIVATE_KEY_PATH',
          );
          if (!filePath) {
            throw new Error(
              'Missing SALESFORCE_PRIVATE_KEY_PATH environment variable',
            );
          }
          rawPrivateKey = await fs.readFile(path.resolve(filePath), 'utf8');
          break;
        }

        case PrivateKeySourceType.ENV_VARIABLE: {
          const envPrivateKey = this.configService.get<string>(
            'SALESFORCE_PRIVATE_KEY',
          );
          if (!envPrivateKey) {
            throw new Error(
              'Missing SALESFORCE_PRIVATE_KEY environment variable',
            );
          }
          rawPrivateKey = envPrivateKey;
          break;
        }

        case PrivateKeySourceType.AWS_SECRET: {
          if (!this.secretsManager) {
            throw new Error(
              'AWS Secrets Manager is not initialized. Please configure AWS_REGION',
            );
          }
          const secretName = this.configService.get<string>(
            'SALESFORCE_PRIVATE_KEY_SECRET_NAME',
          );
          if (!secretName) {
            throw new Error(
              'Missing SALESFORCE_PRIVATE_KEY_SECRET_NAME environment variable',
            );
          }
          const response: GetSecretValueCommandOutput =
            await this.secretsManager.getSecretValue({
              SecretId: secretName,
            });
          if (!response.SecretString) {
            throw new Error('Secret value is empty');
          }
          rawPrivateKey = response.SecretString;
          break;
        }

        default:
          throw new Error(`Unsupported private key source type: ${sourceType}`);
      }

      // Format the private key
      const formattedKey = this.formatPrivateKey(rawPrivateKey);

      // Verify the key format by attempting to parse it
      try {
        const keyLines = formattedKey.split('\n');
        if (
          !keyLines[0].includes('BEGIN PRIVATE KEY') ||
          !keyLines[keyLines.length - 2].includes('END PRIVATE KEY')
        ) {
          throw new Error('Invalid private key format after formatting');
        }
      } catch (error) {
        throw new Error(
          `Failed to verify private key format: ${
            error instanceof Error ? error.message : 'Unknown error'
          }`,
        );
      }

      this.logger.debug(
        `Successfully retrieved and formatted private key from ${sourceType}`,
      );

      return formattedKey;
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';
      throw new Error(
        `Failed to get private key from ${sourceType}: ${errorMessage}`,
      );
    }
  }

  /**
   * Get the Salesforce access token
   * Generates a new token if one doesn't exist or if the current one is expired
   * @returns A promise that resolves to the access token
   */
  async getAccessToken(): Promise<string> {
    // Check if we have a valid token
    if (this.accessToken && this.tokenExpiry && this.tokenExpiry > new Date()) {
      this.logger.debug('Using existing Salesforce access token');
      return this.accessToken;
    }

    // Generate a new token
    this.logger.debug('Generating new Salesforce access token');

    try {
      const tokenResponse = await this.authenticateWithJwt();
      this.accessToken = tokenResponse.access_token;
      this.instanceUrl = tokenResponse.instance_url;

      // Set token expiry (Salesforce tokens typically last 1 hour)
      this.tokenExpiry = new Date();
      this.tokenExpiry.setHours(this.tokenExpiry.getHours() + 1);

      return this.accessToken;
    } catch (error: unknown) {
      // Type guard for error object
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';
      const errorStack = error instanceof Error ? error.stack : undefined;

      this.logger.error(
        `Failed to authenticate with Salesforce: ${errorMessage}`,
        errorStack,
      );
      throw new Error(`Salesforce authentication failed: ${errorMessage}`);
    }
  }

  /**
   * Get the Salesforce instance URL
   * @returns The Salesforce instance URL
   * @throws Error if not authenticated
   */
  getInstanceUrl(): string {
    if (!this.instanceUrl) {
      throw new Error(
        'Not authenticated with Salesforce. Call getAccessToken() first.',
      );
    }
    return this.instanceUrl;
  }

  /**
   * Authenticate with Salesforce using JWT OAuth flow
   * @returns A promise that resolves to the token response
   * @private
   */
  private async authenticateWithJwt(): Promise<SalesforceTokenResponse> {
    // Get configuration from environment variables
    const clientId = this.configService.get<string>('SALESFORCE_CLIENT_ID');
    const username = this.configService.get<string>('SALESFORCE_USERNAME');
    const loginUrl = this.configService.get<string>(
      'SALESFORCE_LOGIN_URL',
      'https://test.salesforce.com',
    );

    if (!clientId) {
      throw new Error('Missing SALESFORCE_CLIENT_ID environment variable');
    }

    if (!username) {
      throw new Error('Missing SALESFORCE_USERNAME environment variable');
    }

    if (!loginUrl) {
      throw new Error('Missing SALESFORCE_LOGIN_URL environment variable');
    }

    try {
      // Get the private key using the configured source
      const privateKey = await this.getPrivateKey();

      // Create JWT claim set
      const jwtPayload = {
        iss: clientId,
        prn: username,
        aud: loginUrl,
        exp: Math.floor(Date.now() / 1000) + 300,
      };

      // Sign the JWT
      const assertion = jwt.sign(jwtPayload, privateKey, {
        algorithm: 'RS256',
      });

      // Request the access token
      const tokenUrl = `${loginUrl}/services/oauth2/token`;
      const params = new URLSearchParams();
      params.append(
        'grant_type',
        'urn:ietf:params:oauth:grant-type:jwt-bearer',
      );
      params.append('assertion', assertion);

      const response = await axios.post<SalesforceTokenResponse>(
        tokenUrl,
        params,
        {
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
          },
        },
      );

      this.logger.debug('Successfully authenticated with Salesforce');
      return response.data;
    } catch (error: unknown) {
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';
      const errorStack = error instanceof Error ? error.stack : undefined;

      this.logger.error(
        `JWT authentication failed: ${errorMessage}`,
        errorStack,
      );
      throw new Error(`JWT authentication failed: ${errorMessage}`);
    }
  }
}
