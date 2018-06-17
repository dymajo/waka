const webpack = require('webpack')
const path = require('path')
const BundleAnalyzerPlugin = require('webpack-bundle-analyzer')
  .BundleAnalyzerPlugin
const ManifestPlugin = require('webpack-manifest-plugin')
const OfflinePlugin = require('offline-plugin')
const LodashModuleReplacementPlugin = require('lodash-webpack-plugin')

const ExtractTextPlugin = require('extract-text-webpack-plugin')

const generate = require('./server-static/generator.js')
generate()

const extractSass = new ExtractTextPlugin({
  filename:
    process.env.NODE_ENV === 'production'
      ? 'generated/[name].[contenthash].css'
      : 'generated/[name].css',
  allChunks: true,
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
    app: ['whatwg-fetch', './js/app.jsx', './scss/style.scss'],
    vendor: [
      'react',
      'react-dom',
      'react-router',
      'react-router-dom',
      'react-leaflet',
      'leaflet',
    ],
    analytics: ['autotrack'],
  },
  output: {
    path: __dirname + '/dist/',
    publicPath: '/',
    filename: 'generated/[name].bundle.js',
    chunkFilename: 'generated/[id].chunk.js',
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
        ],
      },
      {
        test: /\.scss$/,
        use: extractSass.extract({
          use: [
            {
              loader: 'css-loader',
              options: {
                sourceMap: true,
              },
            },
            {
              loader: 'resolve-url-loader',
            },
            {
              loader: 'sass-loader',
              options: {
                sourceMap: true,
              },
            },
          ],
          // use style-loader in development
          fallback: 'style-loader',
        }),
      },
      {
        test: /\.svg$/,
        use: [
          {
            loader: 'react-svg-loader',
            options: {
              es5: true,
              svgo: {
                plugins: [
                  {
                    removeAttrs: { attrs: 'xmlns.*' },
                  },
                ],
              },
            },
          },
        ],
      },
    ],
  },
  devServer: {
    contentBase: path.join(__dirname, 'dist'),
    historyApiFallback: {
      rewrites: [{ from: /./, to: '/index-generated.html' }],
    },
    port: 8009,
    host: '0.0.0.0',
    index: 'index-generated.html',
    proxy: {
      '/a': {
        target: 'http://localhost:8000',
      },
    },
  },
  plugins: [
    extractSass,
    // not compatible with leaflet
    // new LodashModuleReplacementPlugin(),
    new webpack.DefinePlugin({
      'process.env': {
        NODE_ENV: JSON.stringify(process.env.NODE_ENV),
      },
    }),
    new webpack.optimize.CommonsChunkPlugin({
      name: 'vendor',
    }),
    new webpack.optimize.CommonsChunkPlugin({
      name: 'app',
      async: true,
      minChunks: 2,
    }),
    new ManifestPlugin({
      fileName: 'assets.json',
    }),
  ],
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
        join_vars: true,
      },
      output: {
        comments: false,
      },
    }),
    new BundleAnalyzerPlugin({
      analyzerMode: 'static',
      openAnalyzer: false,
    }),
    new webpack.optimize.ModuleConcatenationPlugin()
  )

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
        navigateFallbackURL: '/',
      },
    })
  )
} else {
  config.plugins.push(new ConsoleNotifierPlugin())
  console.log('Not building Service Worker')
}

if (process.env.NODE_ENV === 'devlive') {
  console.log('Using Live Server for API')
  config.devServer.proxy['/a'].target = 'https://getwaka.com'
  config.devServer.proxy['/a'].changeOrigin = true
}

module.exports = config
