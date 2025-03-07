import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as jwt from 'jsonwebtoken';
import * as fs from 'fs-extra';
import * as path from 'path';
import axios from 'axios';

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

  /**
   * Constructor for SalesforceAuthService
   * @param configService NestJS config service for retrieving configuration
   */
  constructor(private readonly configService: ConfigService) {}

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
    const privateKeyPath = this.configService.get<string>(
      'SALESFORCE_PRIVATE_KEY_PATH',
    );
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

    if (!privateKeyPath) {
      throw new Error(
        'Missing SALESFORCE_PRIVATE_KEY_PATH environment variable',
      );
    }

    if (!loginUrl) {
      throw new Error('Missing SALESFORCE_LOGIN_URL environment variable');
    }

    try {
      // Read the private key
      const privateKey = await fs.readFile(
        path.resolve(privateKeyPath),
        'utf8',
      );

      // Create JWT claim set
      const jwtPayload = {
        iss: clientId, // Issuer - your connected app's client ID
        prn: username, // Principal - the username of the user
        aud: loginUrl, // Audience - the Salesforce login URL
        exp: Math.floor(Date.now() / 1000) + 300, // Expiration - 5 minutes from now
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
      // Type guard for error object
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
