#!/bin/bash

# Script to deploy the Lambda Processor to AWS Lambda
set -e

# Configuration
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
DEFAULT_MEMORY_SIZE=256
DEFAULT_TIMEOUT=30
NODE_ENV=${NODE_ENV:-"production"}

# Source utility functions
source "$SCRIPT_DIR/scripts/utils.sh"
source "$SCRIPT_DIR/scripts/iam.sh"
source "$SCRIPT_DIR/scripts/lambda.sh"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Function to display usage
usage() {
    echo "Usage: $0 [OPTIONS] [FUNCTION_NAME]"
    echo
    echo "Options:"
    echo "  -e, --environment     Deployment environment (dev|staging|prod) [default: dev]"
    echo "  -r, --region         AWS region [default: us-east-1]"
    echo "  -p, --profile        AWS profile [default: default]"
    echo "  -m, --memory         Lambda memory size in MB [default: 256]"
    echo "  -t, --timeout        Lambda timeout in seconds [default: 30]"
    echo "  -h, --help           Display this help message"
    echo
    echo "Example:"
    echo "  $0 -e prod -r us-west-2 notification-processor"
    exit 1
}

# Function to log messages
log() {
    local level=$1
    shift
    local message=$*
    local timestamp=$(date '+%Y-%m-%d %H:%M:%S')
    case $level in
        "INFO")
            echo -e "${GREEN}[INFO]${NC} ${timestamp} - $message"
            ;;
        "WARN")
            echo -e "${YELLOW}[WARN]${NC} ${timestamp} - $message"
            ;;
        "ERROR")
            echo -e "${RED}[ERROR]${NC} ${timestamp} - $message"
            ;;
    esac
}

# Function to check requirements
check_requirements() {
    local requirements=("aws" "node" "npm" "zip")
    for cmd in "${requirements[@]}"; do
        if ! command -v "$cmd" &> /dev/null; then
            log "ERROR" "$cmd is required but not installed."
            exit 1
        fi
    done

    # Check Node.js version
    local node_version=$(node -v | cut -d'v' -f2)
    if [[ "${node_version%%.*}" -lt 18 ]]; then
        log "ERROR" "Node.js version 18 or higher is required"
        exit 1
    fi
}

# Function to create and configure Lambda layers
create_lambda_layers() {
    log "INFO" "Creating Lambda layers..."
    
    # Create deployment directory if it doesn't exist
    DEPLOY_DIR="$SCRIPT_DIR/deployments/$TIMESTAMP"
    mkdir -p "$DEPLOY_DIR"
    
    # Create temporary directory for layers
    local layer_dir="$SCRIPT_DIR/dist/layers"
    mkdir -p "$layer_dir/nodejs"
    
    # Copy package.json and install production dependencies
    cp package.json "$layer_dir/nodejs/"
    
    # Install production dependencies
    (cd "$layer_dir/nodejs" && npm install --omit=dev)
    
    # Create layer zip
    local layer_zip="$DEPLOY_DIR/layer-${TIMESTAMP}.zip"
    (cd "$layer_dir" && zip -r "$layer_zip" .)
    
    # Publish layer
    local layer_name="${LAMBDA_NAME}-dependencies"
    local layer_arn=$(aws lambda publish-layer-version \
        --layer-name "$layer_name" \
        --description "Dependencies for $LAMBDA_NAME" \
        --zip-file "fileb://$layer_zip" \
        --compatible-runtimes nodejs18.x \
        --region "$AWS_REGION" \
        --profile "$AWS_PROFILE" \
        --query 'LayerVersionArn' \
        --output text)
    
    # Cleanup
    rm -rf "$layer_dir"
    
    echo "$layer_arn"
}

# Function to prepare the deployment package
prepare_deployment_package() {
    log "INFO" "Preparing deployment package..."
    
    # Create deployment directories
    DEPLOY_DIR="$SCRIPT_DIR/deployments/$TIMESTAMP"
    TEMP_DIR=$(mktemp -d)
    mkdir -p "$DEPLOY_DIR"
    
    # Build the application
    log "INFO" "Building application..."
    npm install
    npm run build:prod
    
    # Create a temporary directory for the package
    mkdir -p "$TEMP_DIR/dist"
    
    # Copy the built application
    cp -r dist/* "$TEMP_DIR/dist/"
    
    # Copy package files
    cp package.json "$TEMP_DIR/"
    
    # Install production dependencies
    (cd "$TEMP_DIR" && npm install --omit=dev)
    
    # Copy environment file if it exists
    if [ -f .env ]; then
        cp .env "$TEMP_DIR/"
    fi
    
    # Create deployment package
    local package_zip="$DEPLOY_DIR/${LAMBDA_NAME}_${TIMESTAMP}.zip"
    (cd "$TEMP_DIR" && zip -r "$package_zip" .)
    
    echo "$package_zip"
}

# Function to create environment variables JSON
create_env_vars() {
    cat << EOF
{
    "Variables": {
        "NODE_ENV": "${NODE_ENV}",
        "AWS_REGION": "${AWS_REGION}",
        "LOG_LEVEL": "${LOG_LEVEL:-info}",
        "DEPLOYMENT_TIMESTAMP": "${TIMESTAMP}"
    }
}
EOF
}

# Main execution
main() {
    log "INFO" "Starting deployment process..."
    log "INFO" "Environment: $ENVIRONMENT"
    log "INFO" "AWS Region: $AWS_REGION"
    log "INFO" "Lambda Name: $LAMBDA_NAME"
    
    # Increase file descriptor limits
    increase_file_limits
    
    # Check requirements
    check_requirements
    
    # Create deployment directory
    DEPLOY_DIR="$SCRIPT_DIR/deployments/$TIMESTAMP"
    mkdir -p "$DEPLOY_DIR"
    
    # Create Lambda layers
    local layer_arn=$(create_lambda_layers "$LAMBDA_NAME" "$DEPLOY_DIR" "$AWS_REGION" "$AWS_PROFILE" "$TIMESTAMP")
    
    # Prepare deployment package
    local package_zip=$(prepare_deployment_package "$LAMBDA_NAME" "$DEPLOY_DIR" "$TIMESTAMP")
    
    # Create or get role ARN
    ROLE_NAME="lambda-$LAMBDA_NAME-role"
    if ! aws iam get-role --role-name "$ROLE_NAME" --profile "$AWS_PROFILE" &> /dev/null; then
        create_lambda_role "$ROLE_NAME" "$AWS_REGION" "$AWS_PROFILE"
    fi
    ROLE_ARN=$(aws iam get-role --role-name "$ROLE_NAME" --query 'Role.Arn' --output text --profile "$AWS_PROFILE")
    
    # Create environment variables configuration
    local env_vars=$(create_env_vars)
    
    # Deploy Lambda function
    deploy_lambda "$package_zip" "$layer_arn" "$LAMBDA_NAME" "$ROLE_ARN" "$AWS_REGION" "$AWS_PROFILE" "$env_vars" "$TIMEOUT" "$MEMORY_SIZE"
    
    # Configure SQS trigger
    configure_sqs_trigger "$LAMBDA_NAME" "$AWS_REGION" "$AWS_PROFILE"
    
    log "INFO" "Deployment completed successfully!"
    log "INFO" "Lambda function: $LAMBDA_NAME"
    log "INFO" "Region: $AWS_REGION"
    log "INFO" "Deployment package: $package_zip"
    log "INFO" "Layer ARN: $layer_arn"
}

# Parse command line arguments
while [[ $# -gt 0 ]]; do
    case $1 in
        -e|--environment)
            ENVIRONMENT="$2"
            shift 2
            ;;
        -r|--region)
            AWS_REGION="$2"
            shift 2
            ;;
        -p|--profile)
            AWS_PROFILE="$2"
            shift 2
            ;;
        -m|--memory)
            MEMORY_SIZE="$2"
            shift 2
            ;;
        -t|--timeout)
            TIMEOUT="$2"
            shift 2
            ;;
        -h|--help)
            usage
            ;;
        *)
            LAMBDA_NAME="$1"
            shift
            ;;
    esac
done

# Set defaults
ENVIRONMENT=${ENVIRONMENT:-"dev"}
AWS_REGION=${AWS_REGION:-"us-east-1"}
AWS_PROFILE=${AWS_PROFILE:-"default"}
MEMORY_SIZE=${MEMORY_SIZE:-$DEFAULT_MEMORY_SIZE}
TIMEOUT=${TIMEOUT:-$DEFAULT_TIMEOUT}
LAMBDA_NAME=${LAMBDA_NAME:-"notification-processor-$ENVIRONMENT"}

# Run main function
main

# Cleanup deployment directory after 7 days
find "$SCRIPT_DIR/deployments" -type d -mtime +7 -exec rm -rf {} + 