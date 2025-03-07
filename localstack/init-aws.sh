#!/bin/bash

# Set default values for environment variables
AWS_REGION=${AWS_REGION:-us-east-1}
SNS_TOPIC_NAME=${SNS_TOPIC_NAME:-notification-events}
SNS_DLQ_TOPIC_NAME=${SNS_DLQ_TOPIC_NAME:-notification-dlq}
SQS_QUEUE_NAME=${SQS_QUEUE_NAME:-notification-queue}
SQS_DLQ_NAME=${SQS_DLQ_NAME:-notification-dlq}
AWS_ENDPOINT=${AWS_ENDPOINT:-http://localhost:4566}

# Create SNS topics
echo "Creating SNS topics..."
aws --endpoint-url=${AWS_ENDPOINT} sns create-topic --name ${SNS_TOPIC_NAME}
aws --endpoint-url=${AWS_ENDPOINT} sns create-topic --name "com-tyfone-nao-application-create"
aws --endpoint-url=${AWS_ENDPOINT} sns create-topic --name "com-tyfone-nao-application-update"
aws --endpoint-url=${AWS_ENDPOINT} sns create-topic --name "com-tyfone-nao-notification"
aws --endpoint-url=${AWS_ENDPOINT} sns create-topic --name ${SNS_DLQ_TOPIC_NAME}

# Create SQS queues
echo "Creating SQS queues..."
aws --endpoint-url=${AWS_ENDPOINT} sqs create-queue --queue-name ${SQS_QUEUE_NAME}
aws --endpoint-url=${AWS_ENDPOINT} sqs create-queue --queue-name "com-tyfone-nao-application-create"
aws --endpoint-url=${AWS_ENDPOINT} sqs create-queue --queue-name "com-tyfone-nao-application-update"
aws --endpoint-url=${AWS_ENDPOINT} sqs create-queue --queue-name "com-tyfone-nao-notification"
aws --endpoint-url=${AWS_ENDPOINT} sqs create-queue --queue-name ${SQS_DLQ_NAME}

# Subscribe SQS to SNS
echo "Subscribing com-tyfone-nao-application-create SQS to SNS..."

aws --endpoint-url=${AWS_ENDPOINT} sns subscribe \
  --topic-arn arn:aws:sns:${AWS_REGION}:000000000000:"com-tyfone-nao-application-create" \
  --protocol sqs \
  --notification-endpoint arn:aws:sqs:${AWS_REGION}:000000000000:"com-tyfone-nao-application-create"

echo "Subscribing com-tyfone-nao-application-update SQS to SNS..."

aws --endpoint-url=${AWS_ENDPOINT} sns subscribe \
  --topic-arn arn:aws:sns:${AWS_REGION}:000000000000:"com-tyfone-nao-application-update" \
  --protocol sqs \
  --notification-endpoint arn:aws:sqs:${AWS_REGION}:000000000000:"com-tyfone-nao-application-update"

echo "Subscribing com-tyfone-nao-notification SQS to SNS..."

aws --endpoint-url=${AWS_ENDPOINT} sns subscribe \
  --topic-arn arn:aws:sns:${AWS_REGION}:000000000000:"com-tyfone-nao-notification" \
  --protocol sqs \
  --notification-endpoint arn:aws:sqs:${AWS_REGION}:000000000000:"com-tyfone-nao-notification"

aws --endpoint-url=${AWS_ENDPOINT} sns subscribe \
  --topic-arn arn:aws:sns:${AWS_REGION}:000000000000:${SNS_TOPIC_NAME} \
  --protocol sqs \
  --notification-endpoint arn:aws:sqs:${AWS_REGION}:000000000000:${SQS_QUEUE_NAME}



# Create KMS key for encryption
echo "Creating KMS key..."
KMS_KEY_OUTPUT=$(aws --endpoint-url=${AWS_ENDPOINT} kms create-key --description "Notification Service Encryption Key")
KMS_KEY_ID=$(echo $KMS_KEY_OUTPUT | grep -o '"KeyId": "[^"]*' | cut -d'"' -f4)

echo "KMS Key ID: ${KMS_KEY_ID}"
echo "AWS resources initialized successfully!"

# Export the KMS key ID for use in the application
echo "export KMS_KEY_ID=${KMS_KEY_ID}" > /tmp/aws-resources.env 