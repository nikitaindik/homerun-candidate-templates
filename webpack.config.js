const path = require('path');
const fs = require('fs');
const Dotenv = require('dotenv-webpack');
const WrapperPlugin = require('wrapper-webpack-plugin');
const lodashTemplate = require('lodash.template');

const packageJson = require('./package.json');
const publishUrl = fs.readFileSync('./.publishUrl', 'utf8');

const userscriptHeaderTemplate = fs.readFileSync(path.resolve(__dirname, 'src', 'userscriptHeader.tpl'), 'utf8');
const userscriptHeader = lodashTemplate(userscriptHeaderTemplate)({ ...packageJson, publishUrl });

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
          use: [
            'style-loader',
            {
              loader: 'css-loader',
              options: {
                modules: {
                  localIdentName: '[local]--[hash:base64:5]',
                },
              },
            },
          ],
        },
        {
          test: /\.tpl$/i,
          use: 'html-loader',
        },
      ],
    },
    plugins: [new Dotenv()].concat(isProductionBuild ? [new WrapperPlugin({ header: userscriptHeader })] : []),
    devtool: isProductionBuild ? false : 'eval-source-map',
  };
};
