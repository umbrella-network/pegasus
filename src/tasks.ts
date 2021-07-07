import 'dotenv';
import yargs from 'yargs';
import {EventEmitter} from 'events';
import {getModelForClass} from '@typegoose/typegoose';

import './boot';
import Application from './lib/Application';
import FeedProcessor from './services/FeedProcessor';
import {loadFeeds} from '@umb-network/toolbox';
import Settings from "./types/Settings";
import Block from './models/Block';
import CryptoCompareWSInitializer from './services/CryptoCompareWSInitializer';
import GasEstimator from './services/GasEstimator';
import CryptoCompareWSClient from './services/ws/CryptoCompareWSClient';
import PolygonIOPriceInitializer from './services/PolygonIOPriceInitializer';

const argv = yargs(process.argv.slice(2)).options({
  task: { type: 'string', demandOption: true },
}).argv;

async function testFeeds(settings: Settings): Promise<void> {
  await Application.get(PolygonIOPriceInitializer).apply();

  const feeds = await loadFeeds(settings.feedsFile);

  await new Promise((resolve) => setTimeout(resolve, 1000000));

  const leaves = await Application.get(FeedProcessor).apply(Date.now(), feeds);
  console.log('Feeds: ', leaves);
}

async function dbCleanUp(): Promise<void> {
  const blockModel = getModelForClass(Block);
  await blockModel.collection.deleteMany({});
}

async function estimateGasPrice(): Promise<void> {
  await Application.get(GasEstimator).apply();
}

const ev = new EventEmitter();
ev.on('done', () => process.exit());

(async () => {
  const settings: Settings = Application.get('Settings');

  switch (argv.task) {
    case 'db:cleanup': {
      await dbCleanUp();
      ev.emit('done');
      break;
    }
    case 'test:feeds': {
      await testFeeds(settings);
      ev.emit('done');
      break;
    }

    case 'estimate:gas-price': {
      await estimateGasPrice();
      ev.emit('done');
      break;
    }
  }
})();

