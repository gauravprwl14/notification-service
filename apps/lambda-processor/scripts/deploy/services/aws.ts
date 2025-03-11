/**
 * @fileoverview AWS Service module for Lambda deployment
 * Handles all AWS SDK interactions including Lambda, IAM, and Layer management
 */

import {
  LambdaClient,
  CreateFunctionCommand,
  UpdateFunctionCodeCommand,
  UpdateFunctionConfigurationCommand,
  PublishLayerVersionCommand,
  CreateEventSourceMappingCommand,
  GetFunctionCommand,
  LambdaClientConfig,
  Runtime,
  ServiceException,
} from '@aws-sdk/client-lambda';

import {
  IAMClient,
  CreateRoleCommand,
  AttachRolePolicyCommand,
  GetRoleCommand,
  CreatePolicyCommand,
} from '@aws-sdk/client-iam';

import { fromIni } from '@aws-sdk/credential-providers';
import { DeploymentConfig } from '../config';
import { logger } from '../utils/logger';

/**
 * Formats AWS error for better logging
 * @param error - Error from AWS SDK
 * @returns Formatted error object
 */
function formatAwsError(error: any): object {
  if (error instanceof ServiceException) {
    const { name, message, $metadata, ...rest } = error;
    return {
      name,
      message,
      requestId: $metadata?.requestId,
      statusCode: $metadata?.httpStatusCode,
      details: rest,
      stack: error.stack,
    };
  }

  // Handle non-AWS errors
  if (error instanceof Error) {
    return {
      name: error.name,
      message: error.message,
      stack: error.stack,
      ...(error as any),
    };
  }

  return error;
}

/**
 * AWS Service class for managing AWS resources
 */
export class AWSService {
  private lambda: LambdaClient;
  private iam: IAMClient;
  private config: DeploymentConfig;
  private readonly MAX_RETRIES = 5;
  private readonly INITIAL_BACKOFF_MS = 2000;
  private readonly STATE_CHECK_INTERVAL_MS = 3000;
  private readonly MAX_STATE_CHECK_ATTEMPTS = 2;

  /**
   * Creates an instance of AWSService
   * @param config - Deployment configuration
   */
  constructor(config: DeploymentConfig) {
    const credentials = fromIni({
      profile: process.env.AWS_PROFILE || 'default',
    });

    // Check if using LocalStack
    const isLocalStack = process.env.AWS_PROFILE === 'localstack';
    const endpoint = isLocalStack ? 'http://localhost:4566' : undefined;

    const awsConfig: LambdaClientConfig = {
      region: config.region,
      credentials,
      maxAttempts: 3,
      endpoint,
      // Disable SSL verification for LocalStack
      tls: !isLocalStack,
    };

    logger.info('AWS Service initialized with:', {
      profile: process.env.AWS_PROFILE,
      endpoint,
      region: config.region,
      isLocalStack,
    });

    this.lambda = new LambdaClient(awsConfig);
    this.iam = new IAMClient(awsConfig);
    this.config = config;
  }

  /**
   * Gets the Lambda runtime based on the configuration
   * @returns The appropriate Runtime enum value
   */
  private getLambdaRuntime(): Runtime {
    switch (this.config.lambda.runtime) {
      case 'nodejs18.x':
        return Runtime.nodejs18x;
      case 'nodejs16.x':
        return Runtime.nodejs16x;
      case 'nodejs14.x':
        return Runtime.nodejs14x;
      default:
        throw new Error(
          `Unsupported Lambda runtime: ${this.config.lambda.runtime}`,
        );
    }
  }

  /**
   * Gets the current state of a Lambda function
   * @param functionName - Name of the function to check
   * @returns Function state information
   */
  private async getFunctionState(functionName: string): Promise<{
    exists: boolean;
    state?: string;
    lastUpdateStatus?: string;
  }> {
    try {
      const response = await this.lambda.send(
        new GetFunctionCommand({ FunctionName: functionName }),
      );

      return {
        exists: true,
        state: response.Configuration?.State,
        lastUpdateStatus: response.Configuration?.LastUpdateStatus,
      };
    } catch (error) {
      if ((error as any).name === 'ResourceNotFoundException') {
        return { exists: false };
      }
      throw error;
    }
  }

  /**
   * Waits for a Lambda function to be in a specific state
   * @param functionName - Name of the function to check
   * @param desiredState - Desired state to wait for
   * @returns Promise that resolves when the function is in the desired state
   */
  private async waitForFunctionState(
    functionName: string,
    desiredState: string,
  ): Promise<void> {
    for (let attempt = 0; attempt < this.MAX_STATE_CHECK_ATTEMPTS; attempt++) {
      const { exists, state, lastUpdateStatus } =
        await this.getFunctionState(functionName);

      if (!exists) {
        if (desiredState === 'NotExists') {
          return;
        }
        throw new Error(`Function ${functionName} does not exist`);
      }

      logger.info(
        `Function ${functionName} - State: ${state}, LastUpdateStatus: ${lastUpdateStatus}`,
      );

      if (state === desiredState && lastUpdateStatus !== 'InProgress') {
        return;
      }

      logger.info(
        `Waiting for function to be ${desiredState}... (${attempt + 1}/${this.MAX_STATE_CHECK_ATTEMPTS})`,
      );
      await new Promise((resolve) =>
        setTimeout(resolve, this.STATE_CHECK_INTERVAL_MS),
      );
    }

    throw new Error(
      `Timeout waiting for function ${functionName} to be in state ${desiredState}`,
    );
  }

  /**
   * Creates or updates a Lambda function with proper state handling
   */
  async deployFunction(params: {
    functionName: string;
    roleArn: string;
    code: Buffer;
    layerArn?: string;
  }): Promise<string> {
    try {
      // Check current function state
      const { exists, state, lastUpdateStatus } = await this.getFunctionState(
        params.functionName,
      );

      logger.info(
        `Function state check - Exists: ${exists}, State: ${state}, LastUpdateStatus: ${lastUpdateStatus}`,
      );

      if (exists) {
        // If an update is in progress, wait for it to complete
        if (lastUpdateStatus === 'InProgress') {
          logger.info('Update in progress, waiting for completion...');
          await this.waitForFunctionState(params.functionName, 'Active');
        }

        // Update existing function
        logger.info(`Updating existing function: ${params.functionName}`);
        await this.updateFunctionWithRetry(params);
      } else {
        // Create new function
        logger.info(`Creating new function: ${params.functionName}`);
        await this.createFunction(params);
      }

      // Wait for the function to be active after deployment
      await this.waitForFunctionState(params.functionName, 'Active');

      return params.functionName;
    } catch (error) {
      logger.error('Error deploying function:', formatAwsError(error));
      throw error;
    }
  }

  /**
   * Updates an existing Lambda function with retry logic
   */
  private async updateFunctionWithRetry(params: {
    functionName: string;
    code: Buffer;
    layerArn?: string;
  }): Promise<void> {
    let lastError: any;
    let backoffMs = this.INITIAL_BACKOFF_MS;

    for (let attempt = 0; attempt < this.MAX_RETRIES; attempt++) {
      try {
        // Update function code
        logger.info(
          `Updating function code (attempt ${attempt + 1}/${this.MAX_RETRIES})...`,
        );
        await this.lambda.send(
          new UpdateFunctionCodeCommand({
            FunctionName: params.functionName,
            ZipFile: params.code,
          }),
        );

        // Wait for code update to complete
        await this.waitForFunctionState(params.functionName, 'Active');

        // Update function configuration
        logger.info('Updating function configuration...');
        await this.lambda.send(
          new UpdateFunctionConfigurationCommand({
            FunctionName: params.functionName,
            Timeout: this.config.lambda.timeout,
            MemorySize: this.config.lambda.memorySize,
            Environment: {
              Variables: this.config.lambda.environment,
            },
            Layers: params.layerArn ? [params.layerArn] : undefined,
          }),
        );

        logger.info('Function update completed successfully');
        return;
      } catch (error: any) {
        lastError = error;

        if (error.name === 'ResourceConflictException') {
          if (attempt < this.MAX_RETRIES - 1) {
            logger.warn(
              `Update conflict detected, retrying in ${backoffMs}ms (attempt ${attempt + 1}/${this.MAX_RETRIES})...`,
            );
            await new Promise((resolve) => setTimeout(resolve, backoffMs));
            backoffMs *= 2; // Exponential backoff
            continue;
          }
        }

        throw error;
      }
    }

    throw new Error(
      `Failed to update function after ${this.MAX_RETRIES} attempts: ${lastError.message}`,
    );
  }

  /**
   * Creates a new Lambda function
   * @param params - Function creation parameters
   */
  private async createFunction(params: {
    functionName: string;
    roleArn: string;
    code: Buffer;
    layerArn?: string;
  }): Promise<void> {
    const command = new CreateFunctionCommand({
      FunctionName: params.functionName,
      Runtime: this.getLambdaRuntime(),
      Handler: this.config.lambda.handler,
      Role: params.roleArn,
      Code: { ZipFile: params.code },
      Timeout: this.config.lambda.timeout,
      MemorySize: this.config.lambda.memorySize,
      Environment: {
        Variables: this.config.lambda.environment,
      },
      Layers: params.layerArn ? [params.layerArn] : undefined,
    });

    await this.lambda.send(command);
  }

  /**
   * Creates or gets an IAM role for the Lambda function
   * @param roleName - Name of the role to create/get
   * @returns Promise resolving to the role ARN
   */
  async createOrGetRole(roleName: string): Promise<string> {
    try {
      // Try to get existing role
      const getCommand = new GetRoleCommand({ RoleName: roleName });
      const { Role } = await this.iam.send(getCommand);
      return Role!.Arn!;
    } catch (error) {
      if ((error as any).name !== 'NoSuchEntity') {
        throw error;
      }

      // Create new role
      return this.createRole(roleName);
    }
  }

  /**
   * Creates a new IAM role with necessary policies
   * @param roleName - Name of the role to create
   * @returns Promise resolving to the role ARN
   */
  private async createRole(roleName: string): Promise<string> {
    // Create base role
    const createCommand = new CreateRoleCommand({
      RoleName: roleName,
      AssumeRolePolicyDocument: JSON.stringify({
        Version: '2012-10-17',
        Statement: [
          {
            Effect: 'Allow',
            Principal: {
              Service: 'lambda.amazonaws.com',
            },
            Action: 'sts:AssumeRole',
          },
        ],
      }),
    });

    const { Role } = await this.iam.send(createCommand);

    // Attach necessary policies
    const policies = [
      'arn:aws:iam::aws:policy/service-role/AWSLambdaBasicExecutionRole',
      'arn:aws:iam::aws:policy/AmazonSQSFullAccess',
      'arn:aws:iam::aws:policy/AmazonSNSFullAccess',
      'arn:aws:iam::aws:policy/AWSKeyManagementServicePowerUser',
    ];

    for (const policy of policies) {
      await this.iam.send(
        new AttachRolePolicyCommand({
          RoleName: roleName,
          PolicyArn: policy,
        }),
      );
    }

    // Create and attach custom policy
    await this.createCustomPolicy(roleName);

    return Role!.Arn!;
  }

  /**
   * Creates and attaches a custom policy for the role
   * @param roleName - Name of the role to attach the policy to
   */
  private async createCustomPolicy(roleName: string): Promise<void> {
    const policyName = `${roleName}-custom-policy`;
    const createCommand = new CreatePolicyCommand({
      PolicyName: policyName,
      PolicyDocument: JSON.stringify({
        Version: '2012-10-17',
        Statement: [
          {
            Effect: 'Allow',
            Action: ['kms:Decrypt', 'kms:GenerateDataKey'],
            Resource: '*',
          },
          {
            Effect: 'Allow',
            Action: ['sqs:*'],
            Resource: `arn:aws:sqs:${this.config.region}:*:*`,
          },
          {
            Effect: 'Allow',
            Action: ['sns:Publish'],
            Resource: `arn:aws:sns:${this.config.region}:*:*`,
          },
        ],
      }),
    });

    const { Policy } = await this.iam.send(createCommand);

    await this.iam.send(
      new AttachRolePolicyCommand({
        RoleName: roleName,
        PolicyArn: Policy!.Arn,
      }),
    );
  }

  /**
   * Creates a Lambda layer
   * @param params - Layer creation parameters
   * @returns Promise resolving to the layer ARN
   */
  async createLayer(params: {
    name: string;
    description: string;
    code: Buffer;
  }): Promise<string> {
    try {
      logger.info(`Creating Lambda layer: ${params.name}`);
      logger.debug('Layer details:', {
        name: params.name,
        description: params.description,
        codeSize: params.code.length,
        runtime: this.config.lambda.runtime,
      });

      const command = new PublishLayerVersionCommand({
        LayerName: params.name,
        Description: params.description,
        Content: {
          ZipFile: params.code,
        },
        CompatibleRuntimes: [this.getLambdaRuntime()],
      });

      const response = await this.lambda.send(command);

      if (!response.LayerVersionArn) {
        throw new Error('Layer version ARN not returned from AWS');
      }

      logger.info(`Successfully created layer: ${response.LayerVersionArn}`);
      return response.LayerVersionArn;
    } catch (error) {
      // Log the full error for debugging
      logger.error('Full error details:', error);

      // Format and log the error in a structured way
      const formattedError = formatAwsError(error);
      logger.error('Error creating Lambda layer:', formattedError);

      throw error;
    }
  }

  /**
   * Creates an SQS event source mapping for the Lambda function
   * @param params - Event source mapping parameters
   */
  async createEventSourceMapping(params: {
    functionName: string;
    eventSourceArn: string;
  }): Promise<void> {
    const command = new CreateEventSourceMappingCommand({
      FunctionName: params.functionName,
      EventSourceArn: params.eventSourceArn,
      BatchSize: 10,
      MaximumBatchingWindowInSeconds: 5,
    });

    await this.lambda.send(command);
  }
}
