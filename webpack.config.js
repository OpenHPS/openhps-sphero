const TerserPlugin = require('terser-webpack-plugin');

const path = require('path');

module.exports = [{
  mode: 'development',
  entry: './dist/cjs/index.js',
  devtool: 'source-map',
  output: {
    path: path.resolve(__dirname, 'dist/web'),
    filename: 'openhps-sphero.js',
    library: '@openhps/sphero',
    libraryTarget: 'umd',
    umdNamedDefine: true,
    globalObject: `(typeof self !== 'undefined' ? self : this)`,
  },
  resolve: {
    alias: {
      "../../../lib/server/lib/dist": "../../../../lib/web/dist",
      "../../lib/server/lib/dist": "../../../lib/web/dist",
    }
  },
  externals: {
    "@openhps/core": "@openhps/core",
  },
},{
  mode: 'production',
  entry: './dist/cjs/index.js',
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
      "../../../lib/server/lib/dist": "../../../../lib/web/dist",
      "../../lib/server/lib/dist": "../../../lib/web/dist",
    }
  },
  externals: {
    "@openhps/core": "@openhps/core"
  },
  output: {
    path: path.resolve(__dirname, 'dist/web'),
    filename: 'openhps-sphero.min.js',
    library: '@openhps/sphero',
    libraryTarget: 'umd',
    umdNamedDefine: true,
    globalObject: `(typeof self !== 'undefined' ? self : this)`,
  }
}];