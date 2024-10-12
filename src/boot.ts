import 'reflect-metadata';
import './config/setupDotenv.js';

import {initMongoDB} from './config/initMongoDB.js';
import Migrations from './services/Migrations.js';
import ApplicationUpdateService from './services/ApplicationUpdateService.js';
import Application from './lib/Application.js';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
(BigInt.prototype as any).toJSON = function () {
  return this.toString();
};

export async function boot(migrations = false): Promise<void> {
  const {default: settings} = await import('./config/settings.js');

  await initMongoDB(settings);

  if (migrations) {
    await Migrations.apply();
  }

  await Application.get(ApplicationUpdateService).startUpdate();
}
