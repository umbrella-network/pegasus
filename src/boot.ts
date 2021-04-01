import dotenv from 'dotenv';
dotenv.config();

process.env['NEW_RELIC_ENABLED'] = process.env['NEW_RELIC_ENABLED'] || 'false';
import 'newrelic';

import 'reflect-metadata';

import initMongoDB from './config/initMongoDB';

(async () => {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const { default: settings } = await require('./config/settings');

  await initMongoDB(settings);
})()
