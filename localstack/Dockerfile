FROM localstack/localstack:latest

# Set environment variables
ENV SERVICES=sns,sqs,kms,lambda
ENV DEBUG=1
ENV DATA_DIR=/tmp/localstack/data
ENV AWS_DEFAULT_REGION=us-east-1
ENV AWS_ACCESS_KEY_ID=test
ENV AWS_SECRET_ACCESS_KEY=test

# Copy initialization scripts
COPY init-aws.sh /docker-entrypoint-initaws.d/
RUN chmod +x /docker-entrypoint-initaws.d/init-aws.sh

# Expose LocalStack ports
EXPOSE 4566

# Set health check
HEALTHCHECK --interval=10s --timeout=5s --start-period=15s --retries=5 \
    CMD curl -f http://localhost:4566/health || exit 1

# Set entrypoint
ENTRYPOINT ["docker-entrypoint.sh"] 