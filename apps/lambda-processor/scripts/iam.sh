#!/bin/bash

# Function to create and configure Lambda role
create_lambda_role() {
    local role_name=$1
    local aws_region=$2
    local aws_profile=$3
    
    log "INFO" "Creating Lambda execution role: $role_name"
    
    # Create temporary files for policies
    local trust_policy_file=$(create_temp_dir)/trust-policy.json
    local custom_policy_file=$(create_temp_dir)/custom-policy.json
    
    # Create trust policy document
    local trust_policy='{
        "Version": "2012-10-17",
        "Statement": [{
            "Effect": "Allow",
            "Principal": {
                "Service": "lambda.amazonaws.com"
            },
            "Action": "sts:AssumeRole"
        }]
    }'
    
    write_json_to_file "$trust_policy" "$trust_policy_file"
    
    # Create the IAM role
    aws iam create-role \
        --role-name "$role_name" \
        --assume-role-policy-document "file://$trust_policy_file" \
        --profile "$aws_profile" || {
        log "ERROR" "Failed to create IAM role"
        cleanup_file "$trust_policy_file"
        cleanup_file "$custom_policy_file"
        return 1
    }
    
    # Attach required policies
    local policies=(
        "arn:aws:iam::aws:policy/service-role/AWSLambdaBasicExecutionRole"
        "arn:aws:iam::aws:policy/AmazonSQSFullAccess"
        "arn:aws:iam::aws:policy/AmazonSNSFullAccess"
        "arn:aws:iam::aws:policy/AWSKeyManagementServicePowerUser"
    )
    
    for policy in "${policies[@]}"; do
        log "INFO" "Attaching policy: $policy"
        aws iam attach-role-policy \
            --role-name "$role_name" \
            --policy-arn "$policy" \
            --profile "$aws_profile" || {
            log "ERROR" "Failed to attach policy $policy"
            cleanup_file "$trust_policy_file"
            cleanup_file "$custom_policy_file"
            return 1
        }
    done
    
    # Create custom policy for environment-specific resources
    local custom_policy='{
        "Version": "2012-10-17",
        "Statement": [
            {
                "Effect": "Allow",
                "Action": [
                    "kms:Decrypt",
                    "kms:GenerateDataKey"
                ],
                "Resource": "*"
            },
            {
                "Effect": "Allow",
                "Action": [
                    "sqs:*"
                ],
                "Resource": "arn:aws:sqs:'${aws_region}':*:*"
            },
            {
                "Effect": "Allow",
                "Action": [
                    "sns:Publish"
                ],
                "Resource": "arn:aws:sns:'${aws_region}':*:*"
            }
        ]
    }'
    
    write_json_to_file "$custom_policy" "$custom_policy_file"
    
    # Create and attach custom policy
    local custom_policy_name="${role_name}-custom-policy"
    aws iam create-policy \
        --policy-name "$custom_policy_name" \
        --policy-document "file://$custom_policy_file" \
        --profile "$aws_profile" || {
        log "WARN" "Custom policy already exists or failed to create"
    }
    
    # Get the AWS account ID
    local account_id=$(aws sts get-caller-identity --query "Account" --output text --profile "$aws_profile")
    
    # Attach custom policy
    aws iam attach-role-policy \
        --role-name "$role_name" \
        --policy-arn "arn:aws:iam::${account_id}:policy/${custom_policy_name}" \
        --profile "$aws_profile" || {
        log "WARN" "Failed to attach custom policy"
    }
    
    # Cleanup temporary files
    cleanup_file "$trust_policy_file"
    cleanup_file "$custom_policy_file"
    
    log "INFO" "Waiting for role to propagate..."
    sleep 10
    
    return 0
}

# Export functions
export -f create_lambda_role 