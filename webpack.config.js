const TerserPlugin = require('terser-webpack-plugin');
const WebpackAutoInject = require('webpack-auto-inject-version');

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
  plugins: [
    new WebpackAutoInject({
      SHORT: '@openhps/sphero',
      components: {
        AutoIncreaseVersion: false,
      },
      componentsOptions: {
        InjectAsComment: {
          tag: 'Version: {version} - {date}',
          dateFormat: 'isoDate',
        },
      },
    }),
  ],
  externals: {
    "@openhps/core": "@openhps/core",
    "spherov2.js-server": "spherov2.js-web"
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
  plugins: [
      new WebpackAutoInject({
          SHORT: '@openhps/sphero',
          components: {
            AutoIncreaseVersion: false,
          },
          componentsOptions: {
            InjectAsComment: {
              tag: 'Version: {version} - {date}',
              dateFormat: 'isoDate',
            },
          },
      }),
  ],
  externals: {
    "@openhps/core": "@openhps/core",
    "spherov2.js-server": "spherov2.js-web"
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