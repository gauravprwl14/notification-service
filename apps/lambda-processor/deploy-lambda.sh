#!/bin/bash

# Script to deploy the Lambda Processor to AWS Lambda

# Exit on any error
set -e

# Function to cleanup and exit
cleanup_and_exit() {
    local exit_code=$1
    local error_message=$2
    
    echo "Cleaning up..."
    if [ -d "$TEMP_DIR" ]; then
        rm -rf "$TEMP_DIR"
    fi
    
    if [ $exit_code -ne 0 ]; then
        echo "Error: $error_message"
        echo "Deployment failed!"
    else
        echo "Deployment completed successfully!"
        echo "Lambda function: $LAMBDA_NAME"
        echo "Region: $AWS_REGION"
        echo "Deployment package: $ZIP_FILE"
    fi
    
    exit $exit_code
}

# Trap errors
trap 'cleanup_and_exit 1 "Script interrupted"' INT TERM

# Function to check and configure SSL
configure_ssl() {
    # Check if running on macOS
    if [[ "$(uname)" == "Darwin" ]]; then
        # Check if Python is using system certificates
        if [ -z "$SSL_CERT_FILE" ] && [ -z "$REQUESTS_CA_BUNDLE" ]; then
            # Try to find and use system certificates
            local cert_paths=(
                "/etc/ssl/cert.pem"  # macOS Catalina and later
                "/usr/local/etc/openssl/cert.pem"  # Homebrew OpenSSL
                "/usr/local/etc/openssl@1.1/cert.pem"  # Homebrew OpenSSL 1.1
                "/opt/homebrew/etc/openssl@3/cert.pem"  # Apple Silicon Homebrew
            )
            
            for cert_path in "${cert_paths[@]}"; do
                if [ -f "$cert_path" ]; then
                    export SSL_CERT_FILE="$cert_path"
                    export REQUESTS_CA_BUNDLE="$cert_path"
                    echo "Using SSL certificates from: $cert_path"
                    return 0
                fi
            done
            
            echo "Warning: Could not find system SSL certificates"
        fi
    fi
}

# Configure SSL certificates
configure_ssl

# Ensure we're in the right directory
cd "$(dirname "$0")"
SCRIPT_DIR="$(pwd)"
echo "Script directory: $SCRIPT_DIR"

# Check if AWS CLI is installed
if ! command -v aws &> /dev/null; then
    cleanup_and_exit 1 "AWS CLI is not installed. Please install it first.\nVisit: https://docs.aws.amazon.com/cli/latest/userguide/getting-started-install.html"
fi

# Function to run AWS CLI commands with retry
aws_cli_with_retry() {
    local max_attempts=2
    local attempt=1
    local delay=5
    local command=("$@")
    
    while [ $attempt -le $max_attempts ]; do
        if "${command[@]}" 2>&1; then
            return 0
        fi
        
        echo "Attempt $attempt failed. Retrying in $delay seconds..."
        sleep $delay
        ((attempt++))
        # Exponential backoff
        delay=$((delay * 2))
    done
    
    echo "Failed after $max_attempts attempts"
    return 1
}

# Check if AWS CLI is configured with retry
if ! aws_cli_with_retry aws sts get-caller-identity &> /dev/null; then
    cleanup_and_exit 1 "AWS CLI is not configured or having connectivity issues. Please run 'aws configure' first."
fi

# Get deployment parameters
LAMBDA_NAME=${1:-"notification-processor"}
AWS_REGION=${2:-$(aws configure get region)}
AWS_PROFILE=${3:-$(aws configure get profile)}

echo "Deploying Lambda Processor to AWS Lambda..."
echo "Lambda Name: $LAMBDA_NAME"
echo "AWS Region: $AWS_REGION"
echo "AWS Profile: $AWS_PROFILE"

# Create deployment directory with timestamp
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
DEPLOY_DIR="$SCRIPT_DIR/deployments/$TIMESTAMP"
mkdir -p "$DEPLOY_DIR"
echo "Created deployment directory: $DEPLOY_DIR"

# Create a temporary directory for the deployment package
TEMP_DIR=$(mktemp -d)
echo "Created temporary directory: $TEMP_DIR"

# Build the Lambda Processor
echo "Building Lambda Processor..."
cd ../../
if ! npx nx build lambda-processor; then
    cleanup_and_exit 1 "Failed to build Lambda Processor."
fi

# Create the deployment package directory structure
echo "Creating deployment package..."
mkdir -p "$TEMP_DIR/dist"
cp -r dist/apps/lambda-processor/* "$TEMP_DIR/dist/"

# Copy package.json and install production dependencies
cp package.json "$TEMP_DIR/"
cp package-lock.json "$TEMP_DIR/"
cd "$TEMP_DIR"
if ! npm ci --production; then
    cleanup_and_exit 1 "Failed to install production dependencies."
fi

# Copy the necessary libraries from the monorepo
echo "Copying libraries..."
mkdir -p "$TEMP_DIR/libs"

# Function to copy library
copy_library() {
    local lib_name=$1
    if [ -d "../../dist/libs/$lib_name" ]; then
        mkdir -p "$TEMP_DIR/libs/$lib_name"
        cp -r "../../dist/libs/$lib_name/"* "$TEMP_DIR/libs/$lib_name/"
    else
        echo "Warning: Library $lib_name not found in dist folder"
    fi
}

# Copy required libraries
copy_library "core"
copy_library "provider-adapters"
copy_library "salesforce-integration"

# Create the zip file
echo "Creating deployment zip file..."
ZIP_FILE="$DEPLOY_DIR/${LAMBDA_NAME}_${TIMESTAMP}.zip"
if ! zip -r "$ZIP_FILE" .; then
    cleanup_and_exit 1 "Failed to create zip file."
fi

echo "Deployment package created: $ZIP_FILE"

# Function to create and configure Lambda role
create_lambda_role() {
    local role_name=$1
    
    echo "Creating Lambda execution role..."
    
    # Create trust policy document
    cat > "$TEMP_DIR/trust-policy.json" << EOF
{
  "Version": "2025-03-07",
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
    
    # Create role with retries
    if ! aws_cli_with_retry aws iam create-role \
        --role-name "$role_name" \
        --assume-role-policy-document "file://$TEMP_DIR/trust-policy.json" \
        --profile "$AWS_PROFILE"; then
        cleanup_and_exit 1 "Failed to create IAM role"
    fi
    
    # Attach policies
    local policies=(
        "arn:aws:iam::aws:policy/service-role/AWSLambdaBasicExecutionRole"
        "arn:aws:iam::aws:policy/AmazonSQSFullAccess"
        "arn:aws:iam::aws:policy/AmazonSNSFullAccess"
        "arn:aws:iam::aws:policy/AWSKeyManagementServicePowerUser"
    )
    
    for policy in "${policies[@]}"; do
        if ! aws_cli_with_retry aws iam attach-role-policy \
            --role-name "$role_name" \
            --policy-arn "$policy" \
            --profile "$AWS_PROFILE"; then
            cleanup_and_exit 1 "Failed to attach policy $policy to role"
        fi
    done
    
    # Wait for role to propagate
    echo "Waiting for role to propagate..."
    sleep 15
}

# Deploy Lambda function
deploy_lambda() {
    # Check if Lambda function exists
    if aws_cli_with_retry aws lambda get-function --function-name "$LAMBDA_NAME" --region "$AWS_REGION" &> /dev/null; then
        echo "Updating existing Lambda function..."
        if ! aws_cli_with_retry aws lambda update-function-code \
            --function-name "$LAMBDA_NAME" \
            --zip-file "fileb://$ZIP_FILE" \
            --region "$AWS_REGION" \
            --profile "$AWS_PROFILE"; then
            cleanup_and_exit 1 "Failed to update Lambda function"
        fi
    else
        echo "Creating new Lambda function..."
        
        # Create role if it doesn't exist
        ROLE_NAME="lambda-$LAMBDA_NAME-role"
        if ! aws_cli_with_retry aws iam get-role --role-name "$ROLE_NAME" &> /dev/null; then
            create_lambda_role "$ROLE_NAME"
        fi
        
        # Get role ARN
        ROLE_ARN=$(aws_cli_with_retry aws iam get-role --role-name "$ROLE_NAME" --query "Role.Arn" --output text --profile "$AWS_PROFILE")
        
        # Create Lambda function
        if ! aws_cli_with_retry aws lambda create-function \
            --function-name "$LAMBDA_NAME" \
            --zip-file "fileb://$ZIP_FILE" \
            --handler "dist/main.handler" \
            --runtime "nodejs18.x" \
            --role "$ROLE_ARN" \
            --timeout 30 \
            --memory-size 256 \
            --environment "Variables={AWS_REGION=$AWS_REGION}" \
            --region "$AWS_REGION" \
            --profile "$AWS_PROFILE"; then
            cleanup_and_exit 1 "Failed to create Lambda function"
        fi
    fi
}

# Deploy the Lambda function
deploy_lambda

# Print next steps
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

# Clean up temporary directory only
cleanup_and_exit 0 "Deployment completed successfully" 