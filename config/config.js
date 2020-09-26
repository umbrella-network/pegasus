const path = require('path');
const rootPath = path.normalize(__dirname + '/..');
const env = process.env.NODE_ENV || 'development';

const config = {
  development: {
    root: rootPath,
    app: {
      name: 'pegasus'
    },
    port: process.env.PORT || 3000,
    db: 'mongodb://localhost/pegasus-development',
    web3: 'ws://127.0.0.1:8545'
  },

  test: {
    root: rootPath,
    app: {
      name: 'pegasus'
    },
    port: process.env.PORT || 3000,
    db: 'mongodb://localhost/pegasus-test'
  },

  production: {
    root: rootPath,
    app: {
      name: 'pegasus'
    },
    port: process.env.PORT || 3000,
    db: 'mongodb://localhost/pegasus'
  }
};

module.exports = config[env];
