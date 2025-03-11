/**
 * @fileoverview Configuration management for Lambda deployment
 */

import { config } from 'dotenv';
import { resolve } from 'path';

// Load environment variables from .env file
config();

/**
 * Command line arguments interface
 */
export interface CommandLineArgs {
  environment?: string;
  region?: string;
  profile?: string;
  memorySize?: string;
  timeout?: string;
  [key: string]: string | undefined; // Index signature to satisfy Record<string, string | undefined>
}

/**
 * Base configuration interface
 */
interface BaseConfig {
  region: string;
  profile: string;
  environment: string;
}

/**
 * Lambda-specific configuration interface
 */
interface LambdaConfig {
  memorySize: number;
  timeout: number;
  runtime: string;
  handler: string;
  environment: Record<string, string>;
}

/**
 * Complete deployment configuration interface
 */
export interface DeploymentConfig extends BaseConfig {
  baseFunctionName: string;
  rootDir: string;
  deployDir: string;
  sourceDir: string;
  lambda: LambdaConfig;
}

/**
 * Gets environment variables for Lambda function
 * @param environment - Deployment environment
 * @returns Environment variables object
 */
function getLambdaEnvironment(environment: string): Record<string, string> {
  // Filter out AWS-specific environment variables that are reserved
  const reservedEnvVars = [
    'AWS_REGION',
    'AWS_DEFAULT_REGION',
    'AWS_ACCESS_KEY',
    'AWS_ACCESS_KEY_ID',
    'AWS_SECRET_KEY',
    'AWS_SECRET_ACCESS_KEY',
    'AWS_SESSION_TOKEN',
    'AWS_SECURITY_TOKEN',
  ];

  // Base environment variables
  const envVars: Record<string, string> = {
    NODE_ENV: environment === 'prod' ? 'production' : environment,
    LOG_LEVEL: process.env.APP_LOG_LEVEL || 'info',
    DEPLOYMENT_TIMESTAMP: new Date().toISOString(),
  };

  // Add all environment variables from process.env that start with APP_
  // This allows for application-specific environment variables
  Object.keys(process.env).forEach((key) => {
    if (
      key.startsWith('APP_') &&
      !reservedEnvVars.includes(key) &&
      process.env[key] !== undefined
    ) {
      // Remove APP_ prefix when adding to Lambda environment
      const lambdaKey = key.replace(/^APP_/, '');
      envVars[lambdaKey] = process.env[key]!;
    }
  });

  return envVars;
}

/**
 * Default configuration values
 */
const defaultConfig: Partial<DeploymentConfig> = {
  region: process.env.AWS_REGION || 'us-east-1',
  profile: process.env.AWS_PROFILE || 'default',
  environment: 'dev',
  baseFunctionName: process.env.APP_FUNCTION_NAME || 'notification-processor',
  lambda: {
    memorySize: parseInt(process.env.APP_MEMORY_SIZE || '256', 10),
    timeout: parseInt(process.env.APP_TIMEOUT || '30', 10),
    runtime: process.env.APP_RUNTIME || 'nodejs18.x',
    handler: process.env.APP_HANDLER || 'main.handler',
    environment: {},
  },
};

/**
 * Creates deployment configuration
 * @param args - Command line arguments
 * @returns Complete deployment configuration
 */
export function createConfig(args: CommandLineArgs): DeploymentConfig {
  const rootDir = resolve(process.cwd(), '../../');
  const environment = args.environment || defaultConfig.environment || 'dev';

  const config: DeploymentConfig = {
    ...defaultConfig,
    ...args,
    environment,
    rootDir,
    deployDir: resolve(rootDir, 'deployments'),
    sourceDir: resolve(rootDir, 'dist'),
    lambda: {
      ...defaultConfig.lambda,
      memorySize: args.memorySize
        ? parseInt(args.memorySize, 10)
        : defaultConfig.lambda!.memorySize,
      timeout: args.timeout
        ? parseInt(args.timeout, 10)
        : defaultConfig.lambda!.timeout,
      environment: getLambdaEnvironment(environment),
    },
  } as DeploymentConfig;

  return config;
}

export default defaultConfig;
