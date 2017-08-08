'use strict'
const webpack = require('webpack')
const path = require('path')
const BundleAnalyzerPlugin = require('webpack-bundle-analyzer').BundleAnalyzerPlugin

const ConsoleNotifierPlugin = function () {}

ConsoleNotifierPlugin.prototype.compilationDone = (stats) => {
  const log = (error) => {
    console.log(error.error.toString())
  }
  stats.compilation.errors.forEach(log)
}

ConsoleNotifierPlugin.prototype.apply = function (compiler) {
  compiler.plugin('done', this.compilationDone.bind(this))
}

let config = {
  entry: {
    app: ['whatwg-fetch', './js/app.jsx'],
    vendor: ['react', 'react-dom', 'react-router', 'autotrack']
  },
  output: {
    path: __dirname + '/dist/',
    publicPath: '/',
    filename: 'generated/[name].bundle.js',
    chunkFilename: 'generated/[id].chunk.js'
  },
  devtool: 'cheap-module-source-map',
  module: {
    rules: [
      { 
        test: /\.(js|jsx)?$/,
        use: 'babel-loader',
        include: [
          path.resolve(__dirname + '/js'),
          path.resolve(__dirname, 'node_modules/autotrack'), // compat with autotrack, as it's published in es6
          path.resolve(__dirname, 'node_modules/dom-utils'), // autotrack
        ]
      }
    ]
  },
  plugins: [
    new webpack.DefinePlugin({
      'process.env': {
        'NODE_ENV': JSON.stringify(process.env.NODE_ENV)
      }
    }),
    new webpack.optimize.CommonsChunkPlugin({
      name: 'vendor'
    }),
    new webpack.optimize.CommonsChunkPlugin({
      name: 'app',
      async: true,
      minChunks: 2
    })
  ]
}
if (process.env.NODE_ENV === 'production') {
  delete config.devtool
  config.plugins.push(
    new webpack.optimize.UglifyJsPlugin({
      compress: {
        warnings: false,
        screw_ie8: true,
        conditionals: true,
        unused: true,
        comparisons: true,
        sequences: true,
        dead_code: true,
        evaluate: true,
        if_return: true,
        join_vars: true,
      },
      output: {
        comments: false
      },
    }),
    new BundleAnalyzerPlugin({
      analyzerMode: 'static',
      openAnalyzer: false
    }),
    new webpack.optimize.ModuleConcatenationPlugin()
  )
} else {
  config.plugins.push(
    new ConsoleNotifierPlugin()
  )
}
module.exports = config