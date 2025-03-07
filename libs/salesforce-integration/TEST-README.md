# Testing Salesforce Integration

This document provides step-by-step instructions for testing the Salesforce integration independently.

## Quick Start

1. **Create and configure the .env file**:
   ```bash
   cp .env.example .env
   ```
   
   Edit the `.env` file with your Salesforce configuration:
   ```
   SALESFORCE_CLIENT_ID=your_connected_app_client_id
   SALESFORCE_USERNAME=your_salesforce_username
   SALESFORCE_PRIVATE_KEY_PATH=/absolute/path/to/your/private_key.pem
   SALESFORCE_LOGIN_URL=https://test.salesforce.com
   SALESFORCE_API_VERSION=v63.0
   SALESFORCE_EVENT_OBJECT=tyfonenao__Notification__e
   ```

2. **Run the test script**:
   ```bash
   ./run-test.sh
   ```

## Troubleshooting

### Environment Variables Not Loading

If you see errors about missing environment variables:

1. Check that your `.env` file exists in the `libs/salesforce-integration` directory
2. Verify that the `.env` file contains all required variables
3. Make sure the private key file exists at the path specified in `SALESFORCE_PRIVATE_KEY_PATH`

The test script will output which environment variables are set and which are missing.

### Authentication Failures

If authentication fails:

1. Verify your Connected App configuration in Salesforce
2. Check that the `SALESFORCE_CLIENT_ID` matches your Connected App's Consumer Key
3. Ensure the `SALESFORCE_USERNAME` has API access in Salesforce
4. Verify the private key is in the correct format (PEM)

### Event Publishing Failures

If event publishing fails:

1. Verify the `SALESFORCE_EVENT_OBJECT` exists in Salesforce
2. Check that it has the required fields (`tyfonenao__Type__c` and `tyfonenao__Data__c`)
3. Ensure the user has permission to publish events

## Manual Testing

You can also run the test script directly:

```bash
node test-salesforce.js
```

This will:
1. Load environment variables from `.env`
2. Authenticate with Salesforce using JWT
3. Send a test notification event
4. Log the results 