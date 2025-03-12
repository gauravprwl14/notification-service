const { composePlugins, withNx } = require('@nx/webpack');
const { join } = require('path');

module.exports = composePlugins(withNx(), (config, { options, context }) => {
  // Update the webpack config as needed here.
  config.resolve.extensions = ['.ts', '.js', '.json'];
  config.target = 'node';

  // Configure output
  config.output = {
    filename: 'main.js',
    path: join(__dirname, '../../dist/apps/lambda-processor'),
    libraryTarget: 'commonjs'
  };

  // Configure externals - specific to AWS Lambda environment
  config.externals = [
    /^@nestjs\/.+$/,
    /^@aws-sdk\/.+$/,
    'class-transformer',
    'class-validator',
    'rxjs',
    'reflect-metadata',
    /^bull$/,
    /^ioredis$/,
    /^jsonwebtoken$/,
    /^fs-extra$/,
    // AWS Lambda specific modules
    'aws-lambda',
    // Handle other node_modules
    ({ context, request }, callback) => {
      if (/^[a-z\-0-9]+$/.test(request)) {
        return callback(null, 'commonjs ' + request);
      }
      callback();
    }
  ];

  return config;
});
