const path = require("path");
const nodeExternals = require("webpack-node-externals");

module.exports = {
  target: "node",
  entry: "./src/get-guardian.js", // Your main file
  externals: [nodeExternals()], // Exclude Node modules

  output: {
    path: path.resolve(__dirname, "dist"),
    filename: "bundle.cjs",
    libraryTarget: "commonjs",
  },
  module: {
    rules: [
      {
        test: /\.js$/,
        exclude: /node_modules\/(?!(ora|chalk)\/).*/,
        use: {
          loader: "babel-loader",
          options: {
            plugins: ["babel-plugin-transform-import-meta"],
          },
        },
      },
    ],
  },
  resolve: {
    fallback: {
      fs: false,
      path: false,
      // ... other Node-specific modules if needed
    },
  },
};
