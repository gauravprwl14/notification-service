// JavaScript version of the test script to avoid TypeScript compilation issues
const dotenv = require('dotenv');
const path = require('path');
const fs = require('fs');
const axios = require('axios');
const jwt = require('jsonwebtoken');

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

    // Validate required environment variables
    const requiredVars = [
      'SALESFORCE_CLIENT_ID',
      'SALESFORCE_USERNAME',
      'SALESFORCE_PRIVATE_KEY_PATH',
    ];

    for (const varName of requiredVars) {
      if (!process.env[varName]) {
        throw new Error(`Missing ${varName} environment variable`);
      }
    }

    // Set default values for optional environment variables
    const loginUrl =
      process.env.SALESFORCE_LOGIN_URL || 'https://test.salesforce.com';
    const apiVersion = process.env.SALESFORCE_API_VERSION || 'v63.0';
    const eventObject =
      process.env.SALESFORCE_EVENT_OBJECT || 'tyfonenao__Notification__e';

    // Test authentication
    console.log('Testing Salesforce authentication...');
    const accessToken = await authenticateWithJwt();
    console.log('Authentication successful!');
    console.log(
      `Access Token: ${accessToken.access_token.substring(0, 10)}...`,
    );
    console.log(`Instance URL: ${accessToken.instance_url}`);

    // Test sending an event
    console.log('\nTesting Salesforce event publishing...');
    const testEvent = {
      type: 'evt.nao.test.event',
      data: JSON.stringify({
        message: 'This is a test notification',
        timestamp: new Date().toISOString(),
        source: 'Salesforce Integration Test Script',
      }),
    };

    const result = await sendNotificationEvent(
      testEvent,
      accessToken.access_token,
      accessToken.instance_url,
    );
    console.log(`Event publishing ${result ? 'successful' : 'failed'}!`);

    console.log('\nSalesforce integration test completed successfully!');
  } catch (error) {
    console.error('Error during Salesforce integration test:');
    console.error(error.message || error);
    if (error.stack) {
      console.error(error.stack);
    }
    process.exit(1);
  }

  /**
   * Authenticate with Salesforce using JWT OAuth flow
   * @returns {Promise<Object>} The token response
   */
  async function authenticateWithJwt() {
    // Get configuration from environment variables
    const clientId = process.env.SALESFORCE_CLIENT_ID;
    const username = process.env.SALESFORCE_USERNAME;
    const privateKeyPath = process.env.SALESFORCE_PRIVATE_KEY_PATH;
    const loginUrl =
      process.env.SALESFORCE_LOGIN_URL || 'https://test.salesforce.com';

    // Read the private key
    const privateKey = fs.readFileSync(path.resolve(privateKeyPath), 'utf8');

    // Create JWT claim set
    const jwtPayload = {
      iss: clientId, // Issuer - your connected app's client ID
      prn: username, // Principal - the username of the user
      aud: loginUrl, // Audience - the Salesforce login URL
      exp: Math.floor(Date.now() / 1000) + 300, // Expiration - 5 minutes from now
    };

    // Sign the JWT
    const assertion = jwt.sign(jwtPayload, privateKey, { algorithm: 'RS256' });

    // Request the access token
    const tokenUrl = `${loginUrl}/services/oauth2/token`;
    const params = new URLSearchParams();
    params.append('grant_type', 'urn:ietf:params:oauth:grant-type:jwt-bearer');
    params.append('assertion', assertion);

    const response = await axios.post(tokenUrl, params.toString(), {
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
    });

    return response.data;
  }

  /**
   * Send a notification event to Salesforce Platform Events
   * @param {Object} event The notification event to send
   * @param {string} accessToken The Salesforce access token
   * @param {string} instanceUrl The Salesforce instance URL
   * @returns {Promise<boolean>} True if the event was sent successfully
   */
  async function sendNotificationEvent(event, accessToken, instanceUrl) {
    // Get the Salesforce API version and event object name from configuration
    const apiVersion = process.env.SALESFORCE_API_VERSION || 'v63.0';
    const eventObjectName =
      process.env.SALESFORCE_EVENT_OBJECT || 'tyfonenao__Notification__e';

    // Construct the event endpoint URL
    const eventUrl = `${instanceUrl}/services/data/${apiVersion}/sobjects/${eventObjectName}`;

    // Prepare the event payload
    const eventPayload = {
      tyfonenao__Type__c: event.type,
      tyfonenao__Data__c: event.data,
    };

    // Send the event to Salesforce
    const response = await axios.post(eventUrl, eventPayload, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
    });

    // Check if the event was sent successfully
    return response.status === 201;
  }
}

// Run the test
main();
