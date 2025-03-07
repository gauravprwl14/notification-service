#!/bin/bash

# Script to run the Salesforce integration test

# Ensure we're in the right directory
cd "$(dirname "$0")"
SCRIPT_DIR="$(pwd)"
echo "Script directory: $SCRIPT_DIR"

# Check if .env file exists
if [ ! -f ".env" ]; then
  echo "Warning: .env file not found in $SCRIPT_DIR"
  echo "Creating .env file from .env.example..."
  
  if [ -f ".env.example" ]; then
    cp .env.example .env
    echo "Created .env file from .env.example. Please edit it with your Salesforce configuration."
  else
    echo "Error: .env.example file not found. Creating an empty .env file."
    touch .env
    echo "# Salesforce Configuration" > .env
    echo "SALESFORCE_CLIENT_ID=" >> .env
    echo "SALESFORCE_USERNAME=" >> .env
    echo "SALESFORCE_PRIVATE_KEY_PATH=" >> .env
    echo "SALESFORCE_LOGIN_URL=https://test.salesforce.com" >> .env
    echo "SALESFORCE_API_VERSION=v63.0" >> .env
    echo "SALESFORCE_EVENT_OBJECT=tyfonenao__Notification__e" >> .env
    echo "Created an empty .env file. Please edit it with your Salesforce configuration."
  fi
  
  echo "Please edit the .env file and run this script again."
  exit 1
fi

echo "Installing dependencies..."
npm install dotenv jsonwebtoken axios fs-extra

echo "Running test..."
node test-salesforce.js

if [ $? -ne 0 ]; then
  echo "Error: Test failed."
  exit 1
fi

echo "Test completed successfully!" 