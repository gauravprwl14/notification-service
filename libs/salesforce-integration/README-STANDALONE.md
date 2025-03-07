# Running Salesforce Integration Independently

This guide explains how to run and test the Salesforce integration independently, without needing to run the entire application stack.

## Prerequisites

- Node.js 18 or later
- npm
- A Salesforce Connected App with JWT OAuth flow configured
- A private key (.pem file) for JWT authentication

## Setup

1. Create a `.env` file in the `libs/salesforce-integration` directory:

```bash
cp .env.example .env
```

2. Edit the `.env` file with your Salesforce configuration:

```
SALESFORCE_CLIENT_ID=your_connected_app_client_id
SALESFORCE_USERNAME=your_salesforce_username
SALESFORCE_PRIVATE_KEY_PATH=/absolute/path/to/your/private_key.pem
SALESFORCE_LOGIN_URL=https://test.salesforce.com
SALESFORCE_API_VERSION=v63.0
SALESFORCE_EVENT_OBJECT=tyfonenao__Notification__e
```

## Running the Test

Run the test script:

```bash
./run-test.sh
```

This script will:
1. Install the necessary dependencies
2. Compile the TypeScript test file
3. Run the test

## What the Test Does

The test script performs the following actions:

1. Authenticates with Salesforce using JWT OAuth flow
2. Retrieves an access token
3. Sends a test notification event to Salesforce Platform Events
4. Logs the results

## Troubleshooting

### Authentication Failures

If authentication fails, check:
- The `SALESFORCE_CLIENT_ID` is correct
- The `SALESFORCE_USERNAME` is correct
- The `SALESFORCE_PRIVATE_KEY_PATH` points to a valid private key file
- The user has API access in Salesforce

### Event Publishing Failures

If event publishing fails, check:
- The `SALESFORCE_EVENT_OBJECT` is correct
- The Platform Event is properly configured in Salesforce
- The user has permission to publish events

### JWT Errors

If you see JWT-related errors, check:
- The private key is in the correct format (PEM)
- The Connected App in Salesforce is configured for JWT OAuth flow
- The public key is uploaded to the Connected App

## Manual Testing

You can also test the integration manually using the Salesforce Workbench or Developer Console to verify that events are being received.

1. Log in to Salesforce
2. Open the Developer Console
3. Click Debug > Open Execute Anonymous Window
4. Enter the following code:

```apex
List<tyfonenao__Notification__e> notifications = [
    SELECT tyfonenao__Type__c, tyfonenao__Data__c
    FROM tyfonenao__Notification__e
    WHERE CreatedDate = TODAY
    ORDER BY CreatedDate DESC
    LIMIT 10
];

for(tyfonenao__Notification__e notification : notifications) {
    System.debug('Type: ' + notification.tyfonenao__Type__c);
    System.debug('Data: ' + notification.tyfonenao__Data__c);
}
```

5. Click Execute to see the most recent notifications 