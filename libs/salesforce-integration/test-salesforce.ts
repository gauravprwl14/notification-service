import { ConfigService } from '@nestjs/config';
import * as dotenv from 'dotenv';
import * as path from 'path';
import * as fs from 'fs';
import { SalesforceAuthService } from './src/lib/auth/salesforce-auth.service';
import {
  SalesforceEventService,
  SalesforceNotificationEvent,
} from './src/lib/events/salesforce-event.service';

/**
 * Test script for Salesforce integration
 * This script can be run independently to test the Salesforce integration
 * without needing to run the entire application stack.
 */
async function main() {
  console.log('Starting Salesforce integration test...');

  try {
    // Get the current directory
    const currentDir = __dirname;
    console.log(`Current directory: ${currentDir}`);

    // Define paths to potential .env files
    const rootEnvPath = path.resolve(currentDir, '../../.env');
    const libEnvPath = path.resolve(currentDir, '.env');

    // Check if .env files exist and load them
    if (fs.existsSync(rootEnvPath)) {
      console.log(`Loading environment variables from: ${rootEnvPath}`);
      dotenv.config({ path: rootEnvPath });
    } else {
      console.log(`Root .env file not found at: ${rootEnvPath}`);
    }

    if (fs.existsSync(libEnvPath)) {
      console.log(`Loading environment variables from: ${libEnvPath}`);
      dotenv.config({ path: libEnvPath });
    } else {
      console.log(`Library .env file not found at: ${libEnvPath}`);
    }

    // Log the environment variables (without sensitive values)
    console.log('\nEnvironment variables:');
    console.log(
      `SALESFORCE_CLIENT_ID: ${process.env.SALESFORCE_CLIENT_ID ? '✓ Set' : '✗ Not set'}`,
    );
    console.log(
      `SALESFORCE_USERNAME: ${process.env.SALESFORCE_USERNAME ? '✓ Set' : '✗ Not set'}`,
    );
    console.log(
      `SALESFORCE_PRIVATE_KEY_PATH: ${process.env.SALESFORCE_PRIVATE_KEY_PATH ? '✓ Set' : '✗ Not set'}`,
    );
    console.log(
      `SALESFORCE_LOGIN_URL: ${process.env.SALESFORCE_LOGIN_URL ? '✓ Set' : '✗ Not set'}`,
    );
    console.log(
      `SALESFORCE_API_VERSION: ${process.env.SALESFORCE_API_VERSION ? '✓ Set' : '✗ Not set'}`,
    );
    console.log(
      `SALESFORCE_EVENT_OBJECT: ${process.env.SALESFORCE_EVENT_OBJECT ? '✓ Set' : '✗ Not set'}\n`,
    );

    // Create a manual ConfigService implementation that uses process.env
    const configService = {
      get: <T>(key: string, defaultValue?: T): T => {
        const value = process.env[key];
        if (value === undefined) {
          return defaultValue as T;
        }
        return value as unknown as T;
      },
    } as ConfigService;

    // Initialize the Salesforce services
    const authService = new SalesforceAuthService(configService);
    const eventService = new SalesforceEventService(configService, authService);

    // Test authentication
    console.log('Testing Salesforce authentication...');
    const accessToken = await authService.getAccessToken();
    console.log('Authentication successful!');
    console.log(`Access Token: ${accessToken.substring(0, 10)}...`);

    const instanceUrl = authService.getInstanceUrl();
    console.log(`Instance URL: ${instanceUrl}`);

    // Test sending an event
    console.log('\nTesting Salesforce event publishing...');
    const testEvent: SalesforceNotificationEvent = {
      type: 'evt.nao.test.event',
      data: JSON.stringify({
        message: 'This is a test notification',
        timestamp: new Date().toISOString(),
        source: 'Salesforce Integration Test Script',
      }),
    };

    const result = await eventService.sendNotificationEvent(testEvent);
    console.log(`Event publishing ${result ? 'successful' : 'failed'}!`);

    console.log('\nSalesforce integration test completed successfully!');
  } catch (error) {
    console.error('Error during Salesforce integration test:');
    console.error(error instanceof Error ? error.message : error);
    if (error instanceof Error && error.stack) {
      console.error(error.stack);
    }
    process.exit(1);
  }
}

// Run the test
main();
