const dotenv = require('dotenv');

(() => {
  const env = dotenv.config();
  process.env['NEW_RELIC_ENABLED'] = process.env['NEW_RELIC_ENABLED'] || 'false';

  Object.keys(env.parsed).forEach(config => {
    process.env[config] = env.parsed[config].trim();
  });
})()
