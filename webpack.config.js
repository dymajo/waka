const webpack = require('webpack')
const path = require('path')
const BundleAnalyzerPlugin = require('webpack-bundle-analyzer').BundleAnalyzerPlugin
const ManifestPlugin = require('webpack-manifest-plugin')
const OfflinePlugin = require('offline-plugin')

const ExtractTextPlugin = require('extract-text-webpack-plugin')

const extractSass = new ExtractTextPlugin({
  filename: process.env.NODE_ENV === 'production' ? 'generated/[name].[contenthash].css' : 'generated/[name].css'
})
const ConsoleNotifierPlugin = function() {}

ConsoleNotifierPlugin.prototype.compilationDone = stats => {
  const log = error => {
    console.log(error.error.toString())
  }
  stats.compilation.errors.forEach(log)
}

ConsoleNotifierPlugin.prototype.apply = function(compiler) {
  compiler.plugin('done', this.compilationDone.bind(this))
}

let config = {
  entry: {
    app: ['whatwg-fetch', './js/app.jsx'],
    vendor: ['react', 'react-dom', 'react-router', 'react-router-dom', 'react-transition-group', 'react-tap-event-plugin'],
    analytics: ['autotrack']
  },
  output: {
    path: __dirname + '/dist/',
    publicPath: '/',
    filename: 'generated/[name].bundle.js',
    chunkFilename: 'generated/[id].chunk.js'
  },
  devtool: 'eval-source-map',
  module: {
    rules: [
      {
        test: /\.(js|jsx)?$/,
        use: 'babel-loader',
        include: [
          path.resolve(__dirname + '/js'),
          path.resolve(__dirname, 'node_modules/autotrack'), // compat with autotrack, as it's published in es6
          path.resolve(__dirname, 'node_modules/dom-utils') // autotrack
        ]
      },
      {
        test: /\.scss$/,
        use: extractSass.extract({
          use: [{
            loader: 'css-loader'
          }, {
            loader: 'resolve-url-loader'
          }, {
            loader: 'sass-loader',
          }],
          // use style-loader in development
          fallback: 'style-loader'
        })
      },
      {
        test: /\.svg$/,
        use: [{
          loader: 'react-svg-loader',
          options: {
            es5: true,
            svgo: {
              plugins: [{
                removeAttrs: {attrs: 'xmlns.*'}
              }]
            }
          }
        }]
      }
    ]
  },
  plugins: [
    extractSass,
    new webpack.DefinePlugin({
      'process.env': {
        NODE_ENV: JSON.stringify(process.env.NODE_ENV)
      }
    }),
    new webpack.optimize.CommonsChunkPlugin({
      name: 'vendor'
    }),
    new webpack.optimize.CommonsChunkPlugin({
      name: 'app',
      async: true,
      minChunks: 2
    }),
    new ManifestPlugin({
      fileName: 'assets.json'
    })
  ]
}
if (process.env.NODE_ENV === 'production') {
  config.output.filename = 'generated/[name].[chunkhash].bundle.js'
  config.output.chunkFilename = 'generated/[name].[chunkhash].chunk.js'
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
        join_vars: true
      },
      output: {
        comments: false
      }
    }),
    new BundleAnalyzerPlugin({
      analyzerMode: 'static',
      openAnalyzer: false
    }),
    new webpack.optimize.ModuleConcatenationPlugin(),
  )
} else {
  config.plugins.push(new ConsoleNotifierPlugin())
}
config.plugins.push(
  new OfflinePlugin({
    // caches the root url
    externals: [
      '/',
      '/fonts/OpenSansRegular.woff2',
      '/fonts/OpenSansRegularExt.woff2',
      '/fonts/OpenSansSemiBold.woff2',
      '/fonts/OpenSansSemiBoldExt.woff2',
      '/fonts/OpenSansBold.woff2',
    ],
    ServiceWorker: {
      navigateFallbackURL: '/'
    }
  })
)
module.exports = config
