const dotenv = require('dotenv');

(() => {
  const env = dotenv.config();

  Object.keys(env.parsed).forEach(config => {
    process.env[config] = env.parsed[config].trim();
  });
})()
