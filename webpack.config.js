const path = require('path');
const fs = require('fs');
const Dotenv = require('dotenv-webpack');
const WrapperPlugin = require('wrapper-webpack-plugin');
const lodashTemplate = require('lodash.template');

const packageJson = require('./package.json');

const userscriptHeaderTemplate = fs.readFileSync(path.resolve(__dirname, 'src', 'userscriptHeader.tpl'), 'utf8');
const userscriptHeader = lodashTemplate(userscriptHeaderTemplate)(packageJson);

module.exports = (env) => {
  const isProductionBuild = env.BUILD_MODE === 'production';

  return {
    mode: 'none',
    watch: !isProductionBuild,
    entry: path.resolve(__dirname, 'src/index.js'),
    output: {
      filename: isProductionBuild ? 'homerun.prod.js' : 'homerun.dev.js',
      path: path.resolve(__dirname, 'build'),
    },
    module: {
      rules: [
        {
          test: /\.css$/i,
          use: ['style-loader', 'css-loader'],
        },
      ],
    },
    plugins: [new Dotenv()].concat(isProductionBuild ? [new WrapperPlugin({ header: userscriptHeader })] : []),
  };
};
