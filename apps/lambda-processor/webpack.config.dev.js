const path = require('path');
const TerserPlugin = require('terser-webpack-plugin');

module.exports = {
  target: 'node',
  mode: 'development',
  entry: path.resolve(__dirname, 'src/main.ts'),
  devtool: 'source-map',
  output: {
    filename: 'main.js',
    // path: path.resolve(__dirname, '../../dist/apps/lambda-processor'),
    path: path.resolve(__dirname, 'dist'),
    libraryTarget: 'commonjs2',
  },
  resolve: {
    extensions: ['.ts', '.js'],
    alias: {
      '@notification-service/core': path.resolve(__dirname, '../../libs/core/src'),
      '@notification-service/salesforce-integration': path.resolve(__dirname, '../../libs/salesforce-integration/src'),
      // Add fallbacks for optional dependencies
      bufferutil: false,
      'utf-8-validate': false
    },
    modules: [
      'node_modules',
      path.resolve(__dirname, 'src'),
      path.resolve(__dirname, '../../node_modules'),
    ],
    fallback: {
      bufferutil: false,
      'utf-8-validate': false
    }
  },
  module: {
    rules: [
      {
        test: /\.ts$/,
        use: [
          {
            loader: 'ts-loader',
            options: {
              transpileOnly: true,
              configFile: path.resolve(__dirname, 'tsconfig.json')
            }
          }
        ],
        exclude: /node_modules/,
      },
    ],
  },
  optimization: {
    minimize: true,
    minimizer: [
      new TerserPlugin({
        terserOptions: {
          keep_classnames: true,
          keep_fnames: true,
        },
      }),
    ],
  },
  // Don't exclude any node_modules - bundle everything
  externals: [],
  plugins: [],
  stats: {
    errorDetails: true,
    children: true,
    warnings: true
  }
};
