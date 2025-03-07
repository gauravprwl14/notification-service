#!/bin/bash

# Script to deploy the Lambda Processor to AWS Lambda

# Ensure we're in the right directory
cd "$(dirname "$0")"
SCRIPT_DIR="$(pwd)"
echo "Script directory: $SCRIPT_DIR"

# Check if AWS CLI is installed
if ! command -v aws &> /dev/null; then
  echo "Error: AWS CLI is not installed. Please install it first."
  echo "Visit: https://docs.aws.amazon.com/cli/latest/userguide/getting-started-install.html"
  exit 1
fi

# Check if AWS CLI is configured
if ! aws sts get-caller-identity &> /dev/null; then
  echo "Error: AWS CLI is not configured. Please run 'aws configure' first."
  exit 1
fi

# Get deployment parameters
LAMBDA_NAME=${1:-"notification-processor"}
AWS_REGION=${2:-$(aws configure get region)}
AWS_PROFILE=${3:-$(aws configure get profile)}

echo "Deploying Lambda Processor to AWS Lambda..."
echo "Lambda Name: $LAMBDA_NAME"
echo "AWS Region: $AWS_REGION"
echo "AWS Profile: $AWS_PROFILE"

# Create a temporary directory for the deployment package
TEMP_DIR=$(mktemp -d)
echo "Created temporary directory: $TEMP_DIR"

# Build the Lambda Processor
echo "Building Lambda Processor..."
cd ../../
npx nx build lambda-processor

if [ $? -ne 0 ]; then
  echo "Error: Failed to build Lambda Processor."
  rm -rf "$TEMP_DIR"
  exit 1
fi

# Create the deployment package directory structure
echo "Creating deployment package..."
mkdir -p "$TEMP_DIR/dist"
cp -r dist/apps/lambda-processor/* "$TEMP_DIR/dist/"

# Copy package.json and install production dependencies
cp package.json "$TEMP_DIR/"
cp package-lock.json "$TEMP_DIR/"
cd "$TEMP_DIR"
npm ci --production

# Copy the necessary libraries from the monorepo
echo "Copying libraries..."
mkdir -p "$TEMP_DIR/libs"

# Copy core library
if [ -d "../../dist/libs/core" ]; then
  mkdir -p "$TEMP_DIR/libs/core"
  cp -r ../../dist/libs/core/* "$TEMP_DIR/libs/core/"
fi

# Copy provider-adapters library
if [ -d "../../dist/libs/provider-adapters" ]; then
  mkdir -p "$TEMP_DIR/libs/provider-adapters"
  cp -r ../../dist/libs/provider-adapters/* "$TEMP_DIR/libs/provider-adapters/"
fi

# Copy salesforce-integration library
if [ -d "../../dist/libs/salesforce-integration" ]; then
  mkdir -p "$TEMP_DIR/libs/salesforce-integration"
  cp -r ../../dist/libs/salesforce-integration/* "$TEMP_DIR/libs/salesforce-integration/"
fi

# Create the zip file
echo "Creating deployment zip file..."
ZIP_FILE="$SCRIPT_DIR/$LAMBDA_NAME.zip"
zip -r "$ZIP_FILE" .

if [ $? -ne 0 ]; then
  echo "Error: Failed to create zip file."
  rm -rf "$TEMP_DIR"
  exit 1
fi

echo "Deployment package created: $ZIP_FILE"

# Check if Lambda function exists
if aws lambda get-function --function-name "$LAMBDA_NAME" --region "$AWS_REGION" &> /dev/null; then
  # Update existing Lambda function
  echo "Updating existing Lambda function..."
  aws lambda update-function-code \
    --function-name "$LAMBDA_NAME" \
    --zip-file "fileb://$ZIP_FILE" \
    --region "$AWS_REGION" \
    --profile "$AWS_PROFILE"
else
  # Create new Lambda function
  echo "Creating new Lambda function..."
  
  # Check if Lambda execution role exists
  ROLE_NAME="lambda-$LAMBDA_NAME-role"
  if ! aws iam get-role --role-name "$ROLE_NAME" &> /dev/null; then
    echo "Creating Lambda execution role..."
    
    # Create trust policy document
    cat > "$TEMP_DIR/trust-policy.json" << EOF
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Principal": {
        "Service": "lambda.amazonaws.com"
      },
      "Action": "sts:AssumeRole"
    }
  ]
}
EOF
    
    # Create role
    aws iam create-role \
      --role-name "$ROLE_NAME" \
      --assume-role-policy-document "file://$TEMP_DIR/trust-policy.json" \
      --profile "$AWS_PROFILE"
    
    # Attach policies
    aws iam attach-role-policy \
      --role-name "$ROLE_NAME" \
      --policy-arn "arn:aws:iam::aws:policy/service-role/AWSLambdaBasicExecutionRole" \
      --profile "$AWS_PROFILE"
    
    aws iam attach-role-policy \
      --role-name "$ROLE_NAME" \
      --policy-arn "arn:aws:iam::aws:policy/AmazonSQSFullAccess" \
      --profile "$AWS_PROFILE"
    
    aws iam attach-role-policy \
      --role-name "$ROLE_NAME" \
      --policy-arn "arn:aws:iam::aws:policy/AmazonSNSFullAccess" \
      --profile "$AWS_PROFILE"
    
    aws iam attach-role-policy \
      --role-name "$ROLE_NAME" \
      --policy-arn "arn:aws:iam::aws:policy/AWSKeyManagementServicePowerUser" \
      --profile "$AWS_PROFILE"
    
    # Wait for role to propagate
    echo "Waiting for role to propagate..."
    sleep 10
  fi
  
  # Get role ARN
  ROLE_ARN=$(aws iam get-role --role-name "$ROLE_NAME" --query "Role.Arn" --output text --profile "$AWS_PROFILE")
  
  # Create Lambda function
  aws lambda create-function \
    --function-name "$LAMBDA_NAME" \
    --zip-file "fileb://$ZIP_FILE" \
    --handler "dist/main.handler" \
    --runtime "nodejs18.x" \
    --role "$ROLE_ARN" \
    --timeout 30 \
    --memory-size 256 \
    --environment "Variables={AWS_REGION=$AWS_REGION}" \
    --region "$AWS_REGION" \
    --profile "$AWS_PROFILE"
fi

# Clean up
echo "Cleaning up..."
rm -rf "$TEMP_DIR"

echo "Deployment completed successfully!"
echo "Lambda function: $LAMBDA_NAME"
echo "Region: $AWS_REGION"

# Instructions for setting up SQS trigger
echo ""
echo "Next steps:"
echo "1. Set up environment variables in the AWS Lambda console:"
echo "   - AWS_REGION: $AWS_REGION"
echo "   - AWS_ACCESS_KEY_ID: your_access_key_id"
echo "   - AWS_SECRET_ACCESS_KEY: your_secret_access_key"
echo "   - SQS_QUEUE_URL: your_sqs_queue_url"
echo "   - SQS_DLQ_URL: your_sqs_dlq_url"
echo "   - KMS_KEY_ID: your_kms_key_id"
echo "   - REDIS_HOST: your_redis_host"
echo "   - REDIS_PORT: your_redis_port"
echo "   - SALESFORCE_CLIENT_ID: your_salesforce_client_id"
echo "   - SALESFORCE_USERNAME: your_salesforce_username"
echo "   - SALESFORCE_PRIVATE_KEY_PATH: /tmp/private_key.pem"
echo ""
echo "2. Set up an SQS trigger for the Lambda function:"
echo "   aws lambda create-event-source-mapping \\"
echo "     --function-name $LAMBDA_NAME \\"
echo "     --event-source-arn your_sqs_queue_arn \\"
echo "     --batch-size 10 \\"
echo "     --region $AWS_REGION \\"
echo "     --profile $AWS_PROFILE"
echo ""
echo "3. For Salesforce integration, upload the private key to Lambda:"
echo "   - Create a Lambda layer with the private key"
echo "   - Or use AWS Secrets Manager to store the private key" 