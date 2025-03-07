#!/bin/bash

# Docker setup script for Notification Service
# This script helps set up the Docker environment for the Notification Service

# Set up environment variables
echo "Setting up environment variables..."
if [ ! -f .env ]; then
  echo "Creating .env file from .env.example..."
  cp .env.example .env
fi

if [ ! -f apps/api/.env ]; then
  echo "Creating apps/api/.env file from apps/api/.env.example..."
  cp apps/api/.env.example apps/api/.env
fi

if [ ! -f apps/lambda-processor/.env ]; then
  echo "Creating apps/lambda-processor/.env file from apps/lambda-processor/.env.example..."
  cp apps/lambda-processor/.env.example apps/lambda-processor/.env
fi

if [ ! -f localstack/.env ]; then
  echo "Creating localstack/.env file from localstack/.env.example..."
  cp localstack/.env.example localstack/.env
fi

# Make the LocalStack init script executable
echo "Making LocalStack init script executable..."
chmod +x ./localstack/init-aws.sh

# Move to parent directory to run docker-compose
echo "Moving to parent directory to run docker-compose..."
cd ..

# Build the Docker images
echo "Building Docker images..."
# docker-compose build
podman compose build

# Start the Docker containers
echo "Starting Docker containers..."
# docker-compose up -d
podman compose up -d

# Wait for LocalStack to be ready
echo "Waiting for LocalStack to be ready..."
sleep 10

# Initialize AWS resources in LocalStack
echo "Initializing AWS resources in LocalStack..."
# docker-compose exec localstack /docker-entrypoint-initaws.d/init-aws.sh
podman compose exec localstack /docker-entrypoint-initaws.d/init-aws.sh

echo "Docker setup complete!"
echo "API is running at: http://localhost:3000"
echo "API documentation is available at: http://localhost:3000/docs"
echo "LocalStack is running at: http://localhost:4566" 