const path = require("path");

module.exports = {
  target: "node",
  entry: "./src/get-guardian.js", // Your main file
  output: {
    path: path.resolve(__dirname, "dist"),
    filename: "bundle.js",
  },
  module: {
    rules: [
      {
        test: /\.js$/,
        exclude: /node_modules\/(?!(ora|chalk|other-package)\/).*/,
        use: {
          loader: "babel-loader",
          options: {
            presets: ["@babel/preset-env"],
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
