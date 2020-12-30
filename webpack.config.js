const PROJECT_NAME = "openhps-sphero";
const LIBRARY_NAME = "@openhps/sphero";

const path = require('path');

module.exports = env => [
  {
    name: PROJECT_NAME,
    mode: env.prod ? "production" : "development",
    entry: `./dist/index.js`,
    devtool: 'source-map',
    output: {
      path: path.resolve(__dirname, 'dist'),
      filename: `web/${PROJECT_NAME}${env.prod ? ".min" : ""}.${env.module ? 'mjs' : 'js'}`,
      library: LIBRARY_NAME,
      libraryTarget: 'umd',
      umdNamedDefine: true,
      globalObject: `(typeof self !== 'undefined' ? self : this)`,
    },
    externals: ["@openhps/core"],
    resolve: {
      alias: {
        typescript: false,
        "../../../lib/server/lib/dist": "../../../lib/web/dist",
        "../../lib/server/lib/dist": "../../lib/web/dist",
      },
      fallback: {
        path: false,
        fs: false,
        os: false,
      }
    },
    optimization: {
      minimize: env.prod,
      portableRecords: true,
      usedExports: true,
      providedExports: true
    },
    performance: {
      hints: false,
      maxEntrypointSize: 512000,
      maxAssetSize: 512000
    }
  }
];
