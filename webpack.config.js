var path = require('path');
var webpack = require("webpack");
var AssetsPlugin = require('assets-webpack-plugin');
const HtmlWebpackPlugin = require('html-webpack-plugin');

var useHashAssets = process.env.APP_HASH_ASSETS === 'true';
var cacheDirectory = process.env.APP_CACHE_DIRECTORY === 'true';

var definePlugin = new webpack.DefinePlugin({
  // Make sure process.env.NODE_ENV is defined so that we can strip out all of
  // the developer checks in the React code when compiling for production usage.
  'process.env.NODE_ENV': JSON.stringify('development')
});

var publicPathName = 'public/'
var assetsPlugin = new AssetsPlugin({ path: publicPathName })
var loaderAssetsPlugin = new webpack.LoaderOptionsPlugin({ debug: true })
var TerserPlugin = require("terser-webpack-plugin");
var devtool_type = process.env.NODE_ENV === 'production' ? false : "eval-source-map"

module.exports = {
  context: __dirname,
  mode: 'development',
  performance: {
    hints: false,
    maxEntrypointSize: 512000,
    maxAssetSize: 512000
  },
  optimization: {
    minimize: true,
    minimizer: [new TerserPlugin({
      minify: TerserPlugin.uglifyJsMinify,
      terserOptions: {}
    })]
  },
  entry: './src/index.js'

  // {
  //   app: ,
  //   externalStatus: './src/container/externalStatus.js',
  // }

  ,
  output: {
    path: path.resolve(__dirname, 'public'),
    publicPath: '/',
    filename: 'bundle.js',
    library: 'comprehend'
  },
  // output: {
  //   library: 'comprehend',
  //   path: path.join(__dirname, 'public'),
  //   publicPath: publicPathName,
  //   filename: useHashAssets ? 'comprehend-[name]-[hash].js' : 'comprehend-[name].js'
  // },
  plugins: [
    new HtmlWebpackPlugin({
      template: path.resolve('./public/index.html'),
    }),
    definePlugin, assetsPlugin, loaderAssetsPlugin],
  resolve: {
    modules: [
      'src',
      'node_modules',
      'vendor/src/container'
    ]
  },
  devtool: devtool_type,
  cache: true,
  devServer: {
    port: 8081,
    hot: true,
    historyApiFallback: true,
    open: true,
    // devMiddleware: {
    //   publicPath: "/" + publicPathName,
    //   stats: {
    //     assets: false,
    //     chunkModules: false,
    //     chunks: false,
    //     colors: true,
    //     hash: false,
    //     timings: false,
    //     version: false
    //   },
    // },
    allowedHosts: 'all',
  },
  module: {
    rules: [
      {
        test: /\.scss$/,
        use: [
          {
            loader: 'style-loader'
          },
          {
            loader: 'css-loader'
          },
          {
            loader: 'sass-loader',
            options: {
              sassOptions: {
                includePaths: [
                  path.resolve(__dirname, './node_modules/breakpoint-sass/stylesheets'),
                  path.resolve(__dirname, './node_modules/susy/sass')
                ]
              }
            }
          }
        ]
      },
      {
        test: /\.css$/,
        use: [
          {
            loader: 'style-loader'
          },
          {
            loader: 'css-loader',
          }
        ],
      },
      {
        test: /\.png/,
        use: [
          {
            loader: require.resolve('url-loader'),
            options: {
              limit: 150000,
              mimetype: 'image/png'
            }
          }
        ],
        type: 'javascript/auto'
      },
      {
        test: /favicon\.png/,
        use: [
          {
            loader: 'file-loader',
            options: {
              name: 'favicon.png'
            }
          }
        ]
      },
      {
        test: /\.(woff(2)?|ttf|eot|svg)$/,
        type: 'asset/inline',
      },

      {
        test: /\.js$|jsx/,
        exclude: /node_modules/,
        use:
          [
            {
              loader: 'babel-loader',
              options: {
                // Support class properties - http://babeljs.io/docs/plugins/transform-class-properties/
                presets: ["@babel/preset-react", ["@babel/preset-env", { targets: "defaults" }]],
                plugins: ["@babel/plugin-transform-strict-mode", "@babel/plugin-proposal-class-properties"],
                cacheDirectory: cacheDirectory
              }
            }
          ]
      },

      // these are to support react-widgets
      {
        test: /\.gif$/,
        type: 'asset/resource'
      },
      {
        test: /jquery\.placeholder\.js/,
        use: [
          {
            loader: 'imports-loader',
            options: {
              jQuery: 'jquery'
            }
          }
        ]
      }
    ]
  },
  node: {
    global: true,
  }
};
