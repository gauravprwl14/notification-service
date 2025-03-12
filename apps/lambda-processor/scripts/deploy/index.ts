/**
 * @fileoverview Main entry point for Lambda deployment
 * Orchestrates the deployment process using AWS SDK
 */

import { readFileSync } from 'fs';
import { resolve } from 'path';
import { execSync } from 'child_process';
import { createConfig, DeploymentConfig, CommandLineArgs } from './config';
import { AWSService } from './services/aws';
import { createLayerPackage, createFunctionPackage } from './utils/zip';
import { logger } from './utils/logger';

/**
 * Parses command line arguments
 * @returns Parsed command line arguments
 */
function parseArgs(): CommandLineArgs {
  const args: CommandLineArgs = {};
  const argv = process.argv.slice(2);

  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    switch (arg) {
      case '-e':
      case '--environment':
        args.environment = argv[++i];
        break;
      case '-r':
      case '--region':
        args.region = argv[++i];
        break;
      case '-p':
      case '--profile':
        args.profile = argv[++i];
        break;
      case '-m':
      case '--memory':
        args.memorySize = argv[++i];
        break;
      case '-t':
      case '--timeout':
        args.timeout = argv[++i];
        break;
      case '-h':
      case '--help':
        printUsage();
        process.exit(0);
    }
  }

  return args;
}

/**
 * Prints usage information
 */
function printUsage(): void {
  console.log(`
Usage: npm run deploy -- [OPTIONS]

Options:
  -e, --environment     Deployment environment (dev|staging|prod) [default: dev]
  -r, --region         AWS region [default: us-east-1]
  -p, --profile        AWS profile [default: default]
  -m, --memory         Lambda memory size in MB [default: 256]
  -t, --timeout        Lambda timeout in seconds [default: 30]
  -h, --help           Display this help message

Example:
  npm run deploy -- -e prod -r us-west-2
`);
}

/**
 * Prepares the production dependencies for Lambda layer
 * @param rootDir - Root directory of the project
 * @param targetDir - Directory to install production dependencies
 */
async function prepareProductionDependencies(
  rootDir: string,
  targetDir: string,
): Promise<void> {
  logger.info('Preparing production dependencies...');

  // Create a temporary directory for production dependencies
  execSync(`mkdir -p ${targetDir}`);

  // Copy package files
  execSync(`cp ${resolve(rootDir, 'package.json')} ${targetDir}/`);
  if (
    execSync(
      `test -f ${resolve(rootDir, 'package-lock.json')} && echo "exists"`,
    )
      .toString()
      .trim() === 'exists'
  ) {
    execSync(`cp ${resolve(rootDir, 'package-lock.json')} ${targetDir}/`);
  }

  // Install only production dependencies
  logger.info('Installing production dependencies...');
  execSync('npm install --production', {
    cwd: targetDir,
    stdio: 'inherit',
  });

  logger.info('Production dependencies installed successfully');
}

/**
 * Main deployment function
 * @param config - Deployment configuration
 */
async function deploy(config: DeploymentConfig): Promise<void> {
  try {
    logger.info('Starting deployment process...');
    logger.info('Configuration:', config);

    const aws = new AWSService(config);
    const timestamp = new Date().toISOString().replace(/[:.]/g, '');
    const deployDir = resolve(config.deployDir, timestamp);
    const layerDir = resolve(deployDir, 'layer');
    const functionDir = resolve(deployDir, 'function');

    // Prepare production dependencies for layer
    await prepareProductionDependencies(config.rootDir, layerDir);

    // Create Lambda layer
    logger.info('Creating Lambda layer...');
    const layerZip = await createLayerPackage(
      resolve(layerDir, 'node_modules'),
      resolve(deployDir, 'layer.zip'),
    );
    const layerArn = await aws.createLayer({
      name: `${config.baseFunctionName}-${config.environment}-dependencies`,
      description: `Dependencies for ${config.baseFunctionName}`,
      code: readFileSync(layerZip),
    });

    // Prepare function directory with dist files and essential dependencies
    logger.info('Preparing function package with essential dependencies...');
    execSync(`mkdir -p ${functionDir}`);
    execSync(`cp -r ${resolve(config.rootDir, '../../dist/apps/lambda-processor')}/* ${functionDir}/`);

    // Copy essential dependencies (tslib)
    logger.info('Creating node modules dependencies...');
    execSync(`mkdir -p ${functionDir}/node_modules`);
    logger.info('Copying node modules dependencies...');
    execSync(
      `cp -r ${resolve(layerDir, 'node_modules')}/* ${functionDir}/node_modules`,
    );
    logger.info('Copying tslib dependencies...');
    
    execSync(
      `cp -r ${resolve(layerDir, 'node_modules/tslib')}/* ${functionDir}/node_modules/tslib/`,
    );

    // Create Lambda function package
    logger.info('Creating function package...');
    const functionZip = await createFunctionPackage(
      functionDir,
      resolve(deployDir, 'function.zip'),
    );

    // Create or get IAM role
    logger.info('Setting up IAM role...');
    const roleName = `lambda-${config.baseFunctionName}-${config.environment}-role`;
    const roleArn = await aws.createOrGetRole(roleName);

    // Deploy Lambda function
    logger.info('Deploying Lambda function...');
    const functionName = `${config.baseFunctionName}-${config.environment}`;
    await aws.deployFunction({
      functionName,
      roleArn,
      code: readFileSync(functionZip),
      layerArn,
    });

    // Configure SQS trigger if needed
    const setupTrigger = process.env.SETUP_SQS_TRIGGER === 'true';
    if (setupTrigger && process.env.SQS_QUEUE_ARN) {
      logger.info('Configuring SQS trigger...');
      await aws.createEventSourceMapping({
        functionName,
        eventSourceArn: process.env.SQS_QUEUE_ARN,
      });
    }

    logger.info('Deployment completed successfully!');
  } catch (error) {
    logger.error('Deployment failed:', error);
    process.exit(1);
  } finally {
    // Cleanup
    try {
      logger.info('Cleaning up temporary files...');
      // execSync(`rm -rf ${config.deployDir}/*`);
    } catch (error) {
      logger.warn('Failed to clean up temporary files:', error);
    }
  }
}

// Run deployment
const args = parseArgs();
const config = createConfig(args);
deploy(config).catch((error) => {
  logger.error('Unhandled error:', error);
  process.exit(1);
});
