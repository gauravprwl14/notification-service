#!/bin/bash

# Script to run and manage LocalStack independently
# This allows testing AWS services without running the entire application stack

# Set default command
COMMAND=${1:-"start"}

# Function to start LocalStack
start_localstack() {
  echo "Starting LocalStack..."
  docker-compose up -d
  
  # Wait for LocalStack to be ready
  echo "Waiting for LocalStack to be ready..."
  until docker-compose exec localstack curl -s http://localhost:4566/health > /dev/null; do
    echo "Waiting for LocalStack to be ready..."
    sleep 2
  done
  
  echo "LocalStack is ready!"
  echo "LocalStack is running at: http://localhost:4566"
  echo "Health check: http://localhost:4566/health"
}

# Function to stop LocalStack
stop_localstack() {
  echo "Stopping LocalStack..."
  docker-compose down
  echo "LocalStack stopped."
}

# Function to restart LocalStack
restart_localstack() {
  stop_localstack
  start_localstack
}

# Function to show LocalStack logs
show_logs() {
  echo "Showing LocalStack logs..."
  docker-compose logs -f
}

# Function to initialize AWS resources
init_resources() {
  echo "Initializing AWS resources in LocalStack..."
  # docker-compose exec localstack /docker-entrypoint-initaws.d/init-aws.sh
   podman exec notification-localstack /docker-entrypoint-initaws.d/init-aws.sh
  echo "AWS resources initialized."
}

# Function to list AWS resources
list_resources() {
  echo "Listing AWS resources in LocalStack..."
  echo "SNS Topics:"
  aws --endpoint-url=http://localhost:4566 sns list-topics
  
  echo "SQS Queues:"
  aws --endpoint-url=http://localhost:4566 sqs list-queues
  
  echo "KMS Keys:"
  aws --endpoint-url=http://localhost:4566 kms list-keys
}

# Function to show help
show_help() {
  echo "Usage: $0 [command]"
  echo "Commands:"
  echo "  start       Start LocalStack (default)"
  echo "  stop        Stop LocalStack"
  echo "  restart     Restart LocalStack"
  echo "  logs        Show LocalStack logs"
  echo "  init        Initialize AWS resources"
  echo "  list        List AWS resources"
  echo "  help        Show this help message"
}

# Execute the command
case $COMMAND in
  "start")
    start_localstack
    ;;
  "stop")
    stop_localstack
    ;;
  "restart")
    restart_localstack
    ;;
  "logs")
    show_logs
    ;;
  "init")
    init_resources
    ;;
  "list")
    list_resources
    ;;
  "help")
    show_help
    ;;
  *)
    echo "Unknown command: $COMMAND"
    show_help
    exit 1
    ;;
esac 