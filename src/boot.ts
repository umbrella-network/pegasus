import 'reflect-metadata';
import './config/setupDotenv';

process.env['NEW_RELIC_ENABLED'] = process.env['NEW_RELIC_ENABLED'] || 'false';
import 'newrelic';

import {initMongoDB} from './config/initMongoDB';
import Migrations from './services/Migrations';
import ApplicationUpdateService from './services/ApplicationUpdateService';
import Application from './lib/Application';

export async function boot(): Promise<void> {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const {default: settings} = await require('./config/settings');

  await initMongoDB(settings);
  await Migrations.apply();
  await Application.get(ApplicationUpdateService).startUpdate();
}
