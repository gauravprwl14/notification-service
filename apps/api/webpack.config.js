const { composePlugins, withNx } = require('@nx/webpack');
const { join } = require('path');

// Nx plugins for webpack.
module.exports = composePlugins(withNx(), (config, { options, context }) => {
  // Update the webpack config as needed here.
  // e.g. `config.plugins.push(new MyPlugin())`

  // Add support for importing TypeScript files
  config.resolve.extensions = ['.ts', '.js', '.json'];

  // Set the target to node since this is a backend application
  config.target = 'node';

  // Configure output
  config.output = {
    path: join(__dirname, '../../dist/apps/api'),
    filename: 'main.js',
    libraryTarget: 'commonjs'
  };

  // Configure externals
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
    function (context, request, callback) {
      if (/^[a-z\-0-9]+$/.test(request)) {
        return callback(null, 'commonjs ' + request);
      }
      callback();
    }
  ];

  return config;
});
