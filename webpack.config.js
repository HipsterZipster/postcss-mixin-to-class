const path = require('path');

const config = {
  entry: './index.js',
  target: 'node',
  output: {
    path: path.resolve(__dirname, 'dist'),
    filename: 'postcss-mixin-to-class.bundle.js'
  },
  module: {
    rules: [
      {
        test: /\.js$/,
        exclude: /(node_modules)/,
        use: {
          loader: 'babel-loader?cacheDirectory',
          options: {
            presets: ['env']
          }
        }
      }
    ]
  },
  resolve: {
    extensions: ['.js']
  }
};

module.exports = config;
