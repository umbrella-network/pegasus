import 'dotenv';
import yargs from 'yargs';
import {EventEmitter} from 'events';
import {getModelForClass} from '@typegoose/typegoose';

import './boot';
import Application from './lib/Application';
import FeedProcessor from './services/FeedProcessor';
import loadFeeds from './config/loadFeeds';
import Settings from "./types/Settings";
import Leaf from './models/Leaf';
import Block from './models/Block';
import CryptoCompareWSInitializer from './services/CryptoCompareWSInitializer';
import PriceAggregator from './services/PriceAggregator';
import TimeService from './services/TimeService';
import CryptoCompareWSClient from './services/ws/CryptoCompareWSClient';
import sort from 'fast-sort';

const argv = yargs(process.argv.slice(2)).options({
  task: { type: 'string', demandOption: true }
}).argv;

async function testFeeds(settings: Settings): Promise<void> {
  await Application.get(CryptoCompareWSInitializer).apply();

  const feeds = await loadFeeds(settings.feedsFile);

  await new Promise((resolve) => setTimeout(resolve, 10000));

  const leaves = await Application.get(FeedProcessor).apply(Date.now(), feeds);
  console.log('Feeds: ', leaves);
}

async function priceAggregatorSorted(settings: Settings): Promise<void> {
  const pairs = await CryptoCompareWSInitializer.allPairs(settings.feedsFile);
  const priceAggregator = Application.get(PriceAggregator);
  const timeService = Application.get(TimeService);

  const time = timeService.apply();

  const result = await Promise.all(pairs.map(async ({fsym, tsym}) => {
    const valueTimestamp = (await priceAggregator.valueTimestamp(`${CryptoCompareWSClient.Prefix}${fsym}~${tsym}`, time)) || [0, 0];

    const [price, timestamp] = valueTimestamp;

    return {
      symbol: `${fsym}-${tsym}`,
      price,
      timestamp,
    };
  }));

  console.log(JSON.stringify(sort(result).asc(({timestamp}) => timestamp)));
}

async function dbCleanUp(): Promise<void> {
  const leafModel = getModelForClass(Leaf);
  await leafModel.collection.deleteMany({});

  const blockModel = getModelForClass(Block);
  await blockModel.collection.deleteMany({});
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
    case 'cca:sorted': {
      await priceAggregatorSorted(settings);
      ev.emit('done');
      break;
    }
    case 'test:feeds': {
      await testFeeds(settings);
      ev.emit('done');
      break;
    }
  }
})();

