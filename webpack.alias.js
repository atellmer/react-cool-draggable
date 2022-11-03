const { resolve } = require('path');

const alias = {
  react: resolve(__dirname, './examples/dev/node_modules/react'),
  'react-dom': resolve(__dirname, './examples/dev/node_modules/react-dom'),
  'react-cool-draggable': resolve(__dirname, './src'),
};

module.exports = {
  alias,
};
