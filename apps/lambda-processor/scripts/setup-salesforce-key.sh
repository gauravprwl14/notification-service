#!/bin/bash

# Script to set up the Salesforce private key in AWS Lambda

# Ensure we're in the right directory
cd "$(dirname "$0")/.."
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

# Get parameters
LAMBDA_NAME=${1:-"notification-processor"}
PRIVATE_KEY_PATH=${2:-""}
AWS_REGION=${3:-$(aws configure get region)}
AWS_PROFILE=${4:-$(aws configure get profile)}

# Validate private key path
if [ -z "$PRIVATE_KEY_PATH" ]; then
  echo "Error: Private key path is required."
  echo "Usage: $0 <lambda-name> <private-key-path> [aws-region] [aws-profile]"
  exit 1
fi

if [ ! -f "$PRIVATE_KEY_PATH" ]; then
  echo "Error: Private key file not found at $PRIVATE_KEY_PATH"
  exit 1
fi

echo "Setting up Salesforce private key for Lambda function: $LAMBDA_NAME"
echo "Private key path: $PRIVATE_KEY_PATH"
echo "AWS Region: $AWS_REGION"
echo "AWS Profile: $AWS_PROFILE"

# Option 1: Create a Lambda Layer with the private key
echo "Creating a Lambda Layer with the private key..."

# Create a temporary directory for the layer
TEMP_DIR=$(mktemp -d)
echo "Created temporary directory: $TEMP_DIR"

# Create the layer structure
mkdir -p "$TEMP_DIR/nodejs/keys"
cp "$PRIVATE_KEY_PATH" "$TEMP_DIR/nodejs/keys/private_key.pem"

# Create the zip file
LAYER_ZIP="$SCRIPT_DIR/salesforce-key-layer.zip"
cd "$TEMP_DIR"
zip -r "$LAYER_ZIP" nodejs

if [ $? -ne 0 ]; then
  echo "Error: Failed to create zip file."
  rm -rf "$TEMP_DIR"
  exit 1
fi

# Create or update the Lambda layer
LAYER_NAME="salesforce-key-layer"
LAYER_VERSION=$(aws lambda publish-layer-version \
  --layer-name "$LAYER_NAME" \
  --description "Salesforce private key for JWT authentication" \
  --zip-file "fileb://$LAYER_ZIP" \
  --compatible-runtimes nodejs18.x \
  --region "$AWS_REGION" \
  --profile "$AWS_PROFILE" \
  --query "Version" \
  --output text)

if [ $? -ne 0 ]; then
  echo "Error: Failed to publish Lambda layer."
  rm -rf "$TEMP_DIR"
  exit 1
fi

echo "Lambda layer published: $LAYER_NAME version $LAYER_VERSION"

# Attach the layer to the Lambda function
aws lambda update-function-configuration \
  --function-name "$LAMBDA_NAME" \
  --layers "arn:aws:lambda:$AWS_REGION:$(aws sts get-caller-identity --query "Account" --output text --profile "$AWS_PROFILE"):layer:$LAYER_NAME:$LAYER_VERSION" \
  --environment "Variables={SALESFORCE_PRIVATE_KEY_PATH=/opt/nodejs/keys/private_key.pem}" \
  --region "$AWS_REGION" \
  --profile "$AWS_PROFILE"

if [ $? -ne 0 ]; then
  echo "Error: Failed to update Lambda function configuration."
  rm -rf "$TEMP_DIR"
  exit 1
fi

# Clean up
echo "Cleaning up..."
rm -rf "$TEMP_DIR"
rm -f "$LAYER_ZIP"

echo "Salesforce private key setup completed successfully!"
echo "The private key is now available at /opt/nodejs/keys/private_key.pem in the Lambda environment."
echo "The SALESFORCE_PRIVATE_KEY_PATH environment variable has been set accordingly."

# Option 2: Use AWS Secrets Manager (alternative approach)
# echo ""
# echo "Alternative approach: Using AWS Secrets Manager"
# echo "You can also store the private key in AWS Secrets Manager:"
# echo ""
# echo "1. Create a secret in AWS Secrets Manager:"
# echo "   aws secretsmanager create-secret \\"
# echo "     --name salesforce/private-key \\"
# echo "     --secret-string file://$PRIVATE_KEY_PATH \\"
# echo "     --region $AWS_REGION \\"
# echo "     --profile $AWS_PROFILE"
# echo ""
# echo "2. Grant the Lambda function permission to access the secret:"
# echo "   aws lambda add-permission \\"
# echo "     --function-name $LAMBDA_NAME \\"
# echo "     --statement-id SecretsManagerAccess \\"
# echo "     --action lambda:GetSecretValue \\"
# echo "     --principal secretsmanager.amazonaws.com \\"
# echo "     --region $AWS_REGION \\"
# echo "     --profile $AWS_PROFILE"
# echo ""
# echo "3. Update the Lambda function to retrieve the secret at runtime:"
# echo "   - Modify the code to retrieve the secret using the AWS SDK"
# echo "   - Set SALESFORCE_PRIVATE_KEY_SECRET_NAME environment variable instead of SALESFORCE_PRIVATE_KEY_PATH" 