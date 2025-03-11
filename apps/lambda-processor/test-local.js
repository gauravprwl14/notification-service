/**
 * Local Lambda test runner
 * This script simulates the AWS Lambda environment and invokes the handler function
 */

// Set environment variables for local testing
process.env.NODE_ENV = 'development';
process.env.AWS_REGION = 'us-east-1';
process.env.LOG_LEVEL = 'debug';

// Import the Lambda handler
const path = require('path');
const lambdaPath = path.resolve(__dirname, './dist/main.js');

// Create a mock Lambda context
const context = {
    awsRequestId: 'test-request-' + Date.now(),
    getRemainingTimeInMillis: () => 30000,
    functionName: 'notification-processor-local-test',
    functionVersion: 'local',
    invokedFunctionArn: 'arn:aws:lambda:local:000000000000:function:notification-processor-local-test',
    memoryLimitInMB: '256',
    logGroupName: '/aws/lambda/notification-processor-local-test',
    logStreamName: '2025/03/10/[$LATEST]test',
    identity: null,
    clientContext: null,
    callbackWaitsForEmptyEventLoop: true
};

// Import the test event
const event = require('./test-event.json');

/**
 * Invokes the Lambda handler with the test event and context
 */
async function runTest() {
    console.log('Starting local Lambda test...');
    console.log('Lambda path:', lambdaPath);
    console.log('Event:', JSON.stringify(event, null, 2));

    try {
        // Dynamically import the handler to ensure all dependencies are loaded
        const lambda = require(lambdaPath);

        if (!lambda.handler || typeof lambda.handler !== 'function') {
            throw new Error(`Handler function not found in ${lambdaPath}`);
        }

        // Invoke the handler
        console.log('Invoking handler...');
        const result = await lambda.handler(event, context);

        console.log('Lambda execution completed successfully');
        console.log('Result:', JSON.stringify(result, null, 2));
        return result;
    } catch (error) {
        console.error('Lambda execution failed:');
        console.error(error);
        throw error;
    }
}

// Run the test
runTest()
    .then(() => console.log('Test completed'))
    .catch(err => {
        console.error('Test failed:', err);
        process.exit(1);
    }); 