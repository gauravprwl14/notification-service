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

  /**
   * Creates an instance of AWSService
   * @param config - Deployment configuration
   */
  constructor(config: DeploymentConfig) {
    const credentials = fromIni({
      profile: process.env.AWS_PROFILE || 'default',
    });

    const awsConfig: LambdaClientConfig = {
      region: config.region,
      credentials,
      maxAttempts: 3,
    };

    this.lambda = new LambdaClient(awsConfig);
    this.iam = new IAMClient(awsConfig);
    this.config = config;

    logger.info(
      'AWS Service initialized with profile:',
      process.env.AWS_PROFILE,
    );
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
   * Creates or updates a Lambda function
   * @param params - Function creation parameters
   * @returns Promise resolving to the function ARN
   */
  async deployFunction(params: {
    functionName: string;
    roleArn: string;
    code: Buffer;
    layerArn?: string;
  }): Promise<string> {
    try {
      // Check if function exists
      const exists = await this.functionExists(params.functionName);

      if (exists) {
        logger.info(`Updating existing function: ${params.functionName}`);
        await this.updateFunction(params);
      } else {
        logger.info(`Creating new function: ${params.functionName}`);
        await this.createFunction(params);
      }

      return params.functionName;
    } catch (error) {
      logger.error('Error deploying function:', formatAwsError(error));
      throw error;
    }
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
   * Updates an existing Lambda function
   * @param params - Function update parameters
   */
  private async updateFunction(params: {
    functionName: string;
    code: Buffer;
    layerArn?: string;
  }): Promise<void> {
    // Update function code
    const codeCommand = new UpdateFunctionCodeCommand({
      FunctionName: params.functionName,
      ZipFile: params.code,
    });
    await this.lambda.send(codeCommand);

    // Update function configuration
    const configCommand = new UpdateFunctionConfigurationCommand({
      FunctionName: params.functionName,
      Timeout: this.config.lambda.timeout,
      MemorySize: this.config.lambda.memorySize,
      Environment: {
        Variables: this.config.lambda.environment,
      },
      Layers: params.layerArn ? [params.layerArn] : undefined,
    });
    await this.lambda.send(configCommand);
  }

  /**
   * Checks if a Lambda function exists
   * @param functionName - Name of the function to check
   * @returns Promise resolving to boolean indicating existence
   */
  private async functionExists(functionName: string): Promise<boolean> {
    try {
      await this.lambda.send(
        new GetFunctionCommand({ FunctionName: functionName }),
      );
      return true;
    } catch (error) {
      if ((error as any).name === 'ResourceNotFoundException') {
        return false;
      }
      throw error;
    }
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
