const TerserPlugin = require('terser-webpack-plugin');

const path = require('path');

module.exports = [{
  mode: 'development',
  entry: './dist/index.js',
  devtool: 'source-map',
  output: {
    path: path.resolve(__dirname, 'dist'),
    filename: 'openhps-sphero.js',
    library: '@openhps/sphero',
    libraryTarget: 'umd',
    umdNamedDefine: true,
    globalObject: `(typeof self !== 'undefined' ? self : this)`,
  },
  resolve: {
    alias: {
      "../../../lib/server/dist": "../../../lib/web/dist",
      "../../lib/server/dist": "../../lib/web/dist",
    }
  },
  externals: {
    "@openhps/core": "@openhps/core",
  },
},{
  mode: 'production',
  entry: './dist/index.js',
  devtool: 'source-map',
  optimization: {
    minimize: true,
    minimizer: [
      new TerserPlugin({
        terserOptions: {
          keep_classnames: true,
          keep_fnames: true
        }
      })
    ]
  },
  resolve: {
    alias: {
      "spherov2.js-server": path.resolve(__dirname, 'lib/web/dist'),
      "spherov2.js-web": path.resolve(__dirname, 'lib/web/dist')
    }
  },
  externals: {
    "@openhps/core": "@openhps/core"
  },
  output: {
    path: path.resolve(__dirname, 'dist'),
    filename: 'openhps-sphero.min.js',
    library: '@openhps/sphero',
    libraryTarget: 'umd',
    umdNamedDefine: true,
    globalObject: `(typeof self !== 'undefined' ? self : this)`,
  }
}];