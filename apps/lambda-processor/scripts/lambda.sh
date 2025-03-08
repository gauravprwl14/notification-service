#!/bin/bash

# Function to create Lambda layers
create_lambda_layers() {
    local lambda_name=$1
    local deploy_dir=$2
    local aws_region=$3
    local aws_profile=$4
    local timestamp=$5
    
    log "INFO" "Creating Lambda layers..."
    
    # Create temporary directory for layers
    local layer_dir=$(create_temp_dir)
    mkdir -p "$layer_dir/nodejs"
    
    # Copy package.json and install production dependencies
    cp package.json "$layer_dir/nodejs/"
    (cd "$layer_dir/nodejs" && npm install --omit=dev)
    
    # Create layer zip with file descriptor limit
    local layer_zip="$deploy_dir/layer-${timestamp}.zip"
    (cd "$layer_dir" && find . -type f -print0 | xargs -0 zip "$layer_zip")
    
    # Publish layer
    local layer_name="${lambda_name}-dependencies"
    local layer_arn=$(aws lambda publish-layer-version \
        --layer-name "$layer_name" \
        --description "Dependencies for $lambda_name" \
        --zip-file "fileb://$layer_zip" \
        --compatible-runtimes nodejs18.x \
        --region "$aws_region" \
        --profile "$aws_profile" \
        --query 'LayerVersionArn' \
        --output text)
    
    # Cleanup
    cleanup_dir "$layer_dir"
    
    echo "$layer_arn"
}

# Function to prepare deployment package
prepare_deployment_package() {
    local lambda_name=$1
    local deploy_dir=$2
    local timestamp=$3
    
    log "INFO" "Preparing deployment package..."
    
    # Create temporary directory
    local temp_dir=$(create_temp_dir)
    mkdir -p "$temp_dir/dist"
    
    # Build the application
    log "INFO" "Building application..."
    npm install
    npm run build:prod
    
    # Copy the built application
    cp -r dist/* "$temp_dir/dist/"
    cp package.json "$temp_dir/"
    
    # Install production dependencies
    (cd "$temp_dir" && npm install --omit=dev)
    
    # Copy environment file if it exists
    if [ -f .env ]; then
        cp .env "$temp_dir/"
    fi
    
    # Create deployment package
    local package_zip="$deploy_dir/${lambda_name}_${timestamp}.zip"
    (cd "$temp_dir" && find . -type f -print0 | xargs -0 zip "$package_zip")
    
    # Cleanup
    cleanup_dir "$temp_dir"
    
    echo "$package_zip"
}

# Function to deploy Lambda function
deploy_lambda() {
    local package_zip=$1
    local layer_arn=$2
    local lambda_name=$3
    local role_arn=$4
    local aws_region=$5
    local aws_profile=$6
    local env_vars=$7
    local timeout=${8:-30}
    local memory_size=${9:-256}
    
    log "INFO" "Deploying Lambda function..."
    
    # Create temporary files for configuration
    local config_dir=$(create_temp_dir)
    local function_config_file="$config_dir/function.json"
    
    # Check if function exists
    if aws lambda get-function --function-name "$lambda_name" --region "$aws_region" --profile "$aws_profile" &> /dev/null; then
        log "INFO" "Updating existing Lambda function..."
        
        # Update function code first
        aws lambda update-function-code \
            --function-name "$lambda_name" \
            --zip-file "fileb://$package_zip" \
            --region "$aws_region" \
            --profile "$aws_profile"
        
        # Wait for update to complete
        sleep 5
        
        # Create update configuration JSON
        cat > "$function_config_file" << EOF
{
    "FunctionName": "${lambda_name}",
    "Runtime": "nodejs18.x",
    "Handler": "dist/main.handler",
    "Timeout": ${timeout},
    "MemorySize": ${memory_size},
    "Layers": ["${layer_arn}"],
    "Environment": ${env_vars}
}
EOF
        
        # Update function configuration
        aws lambda update-function-configuration \
            --cli-input-json "file://$function_config_file" \
            --region "$aws_region" \
            --profile "$aws_profile"
    else
        log "INFO" "Creating new Lambda function..."
        
        # Create base configuration JSON
        cat > "$function_config_file" << EOF
{
    "FunctionName": "${lambda_name}",
    "Runtime": "nodejs18.x",
    "Handler": "dist/main.handler",
    "Role": "${role_arn}",
    "Timeout": ${timeout},
    "MemorySize": ${memory_size},
    "Layers": ["${layer_arn}"],
    "Environment": ${env_vars}
}
EOF
        
        # Create function with base configuration and code
        aws lambda create-function \
            --cli-input-json "file://$function_config_file" \
            --zip-file "fileb://$package_zip" \
            --region "$aws_region" \
            --profile "$aws_profile"
    fi
    
    # Cleanup
    cleanup_dir "$config_dir"
}

# Function to configure SQS trigger
configure_sqs_trigger() {
    local lambda_name=$1
    local aws_region=$2
    local aws_profile=$3
    
    log "INFO" "Configuring SQS trigger..."
    read -p "Do you want to set up an SQS trigger? (y/n): " setup_trigger
    
    if [[ "$setup_trigger" == "y" || "$setup_trigger" == "Y" ]]; then
        read -p "Enter the SQS queue ARN: " sqs_queue_arn
        
        if [ -n "$sqs_queue_arn" ]; then
            aws lambda create-event-source-mapping \
                --function-name "$lambda_name" \
                --event-source-arn "$sqs_queue_arn" \
                --batch-size 10 \
                --maximum-batching-window-in-seconds 5 \
                --region "$aws_region" \
                --profile "$aws_profile"
            
            log "INFO" "SQS trigger configured successfully"
        fi
    fi
}

# Export functions
export -f create_lambda_layers
export -f prepare_deployment_package
export -f deploy_lambda
export -f configure_sqs_trigger 