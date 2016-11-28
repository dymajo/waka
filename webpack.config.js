'use strict'
const webpack = require('webpack')

let config = {
  entry: {
    app: "./js/app.tsx",
    vendor: ['react', 'react-dom', 'react-router', 'reqwest', 'leaflet', 'react-leaflet', 'wkx', 'buffer', 'autotrack']
  },
  output: {
    path: __dirname,
    filename: "dist/app.js"
  },
  devtool: "cheap-module-source-map",
  module: {
    loaders: [
      // All files with a '.ts' or '.tsx' extension will be handled by 'ts-loader'.
      { test: /\.tsx?$/, loader: "ts-loader" }
    ],
    preLoaders: [
      // All output '.js' files will have any sourcemaps re-processed by 'source-map-loader'.
      { test: /\.js$/, loader: "source-map-loader" }
    ]
  },
  plugins: [
    new webpack.DefinePlugin({
      'process.env': {
        'NODE_ENV': JSON.stringify(process.env.NODE_ENV)
      }
    }),
    new webpack.optimize.CommonsChunkPlugin('vendor', 'dist/vendor.js')
  ]
}
module.exports = config