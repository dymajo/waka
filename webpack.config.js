const webpack = require('webpack')
const path = require('path')

const { BundleAnalyzerPlugin } = require('webpack-bundle-analyzer')

const ManifestPlugin = require('webpack-manifest-plugin')
const OfflinePlugin = require('offline-plugin')
const MiniCssExtractPlugin = require('mini-css-extract-plugin')

const generate = require('./server-static/generator.js')

generate()

const config = {
  entry: {
    app: ['whatwg-fetch', './js/App.jsx', './scss/style.scss'],
    analytics: ['autotrack'],
  },
  output: {
    path: `${__dirname}/dist/`,
    publicPath: '/',
    filename: 'generated/[name].bundle.js',
    chunkFilename: 'generated/[id].chunk.js',
  },
  devtool: 'cheap-module-eval-source-map',
  module: {
    rules: [
      {
        test: /\.(js|jsx)?$/,
        use: 'babel-loader',
        include: [
          path.resolve(`${__dirname}/js`),
          path.resolve(__dirname, 'node_modules/autotrack'), // compat with autotrack, as it's published in es6
          path.resolve(__dirname, 'node_modules/dom-utils'), // autotrack
        ],
      },
      {
        test: /\.scss$/,
        use: [
          {
            loader: MiniCssExtractPlugin.loader,
          },
          {
            loader: 'css-loader',
            options: {
              sourceMap: true,
            },
          },
          {
            loader: 'resolve-url-loader',
            options: {
              sourceMap: true,
              removeCR: true,
            },
          },
          {
            loader: 'sass-loader',
            options: {
              sourceMap: true,
              outputStyle: 'compressed',
            },
          },
        ],
      },
      {
        test: /\.svg$/,
        use: [
          'babel-loader',
          {
            loader: 'react-svg-loader',
            options: {
              svgo: {
                plugins: [
                  {
                    removeViewBox: false,
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
        pathRewrite: path => path.replace(/^\/a\//, '/'),
        target: 'http://localhost:9001/',
      },
    },
  },
  plugins: [
    new MiniCssExtractPlugin({
      filename:
        process.env.NODE_ENV === 'production'
          ? 'generated/[name].[contenthash].css'
          : 'generated/[name].css',
      chunkFilename: 'generated/[id].[contenthash].css',
    }),
    new webpack.DefinePlugin({
      'process.env': {
        NODE_ENV: JSON.stringify(process.env.NODE_ENV),
      },
    }),
    new ManifestPlugin({
      fileName: 'assets.json',
    }),
  ],
  optimization: {
    splitChunks: {
      chunks: 'async',
      cacheGroups: {
        vendors: {
          test: /[\\/]node_modules[\\/]/,
          name: 'vendor',
          chunks: 'all',
        },
        default: {
          minChunks: 20,
          name: 'app',
        },
      },
    },
  },
}
if (process.env.NODE_ENV === 'production') {
  config.output.filename = 'generated/[name].[chunkhash].bundle.js'
  config.output.chunkFilename = 'generated/[name].[chunkhash].chunk.js'
  config.devtool = 'nosources-source-map'
  config.plugins.push(
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
  console.log('Not building Service Worker')
}

if (process.env.NODE_ENV === 'local') {
  console.log('local server')
  config.devServer.proxy['/a'].target = 'http://localhost:9001'
  config.devServer.proxy['/a'].changeOrigin = true
}

if (process.env.NODE_ENV === 'devlive') {
  console.log('Using Live Server for API')
  config.devServer.proxy['/a'].target = 'https://waka.app'
  config.devServer.proxy['/a'].pathRewrite = null
  config.devServer.proxy['/a'].changeOrigin = true
}

module.exports = config
