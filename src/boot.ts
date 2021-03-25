require('newrelic');
import 'reflect-metadata';
import dotenv from 'dotenv';
import './config/initMongoDB';
import initMongoDB from './config/initMongoDB';

(async () => {
  dotenv.config();

  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const { default: settings } = await require('./config/settings');

  await initMongoDB(settings);
})()
