import {boot} from './boot.js';
import yargs from 'yargs';
import {EventEmitter} from 'events';
import {getModelForClass} from '@typegoose/typegoose';
import {GasEstimator} from '@umb-network/toolbox';

import Application from './lib/Application.js';
import FeedProcessor from './services/FeedProcessor.js';
import loadFeeds from './services/loadFeeds.js';
import Settings from './types/Settings.js';
import Block from './models/Block.js';
import PolygonIOPriceInitializer from './services/PolygonIOPriceInitializer.js';
import CryptoCompareWSInitializer from './services/CryptoCompareWSInitializer.js';
import TimeService from './services/TimeService.js';
import Blockchain from './lib/Blockchain.js';
import {DexCoordinator} from './agents/DexCoordinator.js';
import {DexProtocolName} from './types/DexProtocolName.js';
import {ChainsIds} from './types/ChainsIds.js';

const argv = yargs(process.argv.slice(2)).options({
  task: {type: 'string', demandOption: true},
  chainId: {type: 'string', demandOption: false},
  dexProtocol: {type: 'string', demandOption: false},
}).argv;

async function testFeeds(settings: Settings): Promise<void> {
  await Application.get(PolygonIOPriceInitializer).apply();
  await Application.get(CryptoCompareWSInitializer).apply();

  const feeds = await loadFeeds(settings.feedsFile);

  await new Promise((resolve) => setTimeout(resolve, 2000));

  const leaves = await Application.get(FeedProcessor).apply(new TimeService().apply(), feeds);
  console.log('Feeds: ', leaves);
}

async function dbCleanUp(): Promise<void> {
  const blockModel = getModelForClass(Block);
  await blockModel.collection.deleteMany({});
}

async function estimateGasPrice(settings: Settings): Promise<void> {
  const blockchain = Application.get(Blockchain);
  const {minGasPrice} = settings.blockchain.transactions;
  await GasEstimator.apply(blockchain.provider.getRawProviderSync(), minGasPrice, Number.MAX_SAFE_INTEGER);
}

const ev = new EventEmitter();
ev.on('done', () => process.exit());

(async () => {
  await boot();
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
    case 'test:dex': {
      if (argv.chainId && Object.values(ChainsIds).includes(argv.chainId as ChainsIds)) {
        console.log(`Starting Agent: chainId ${argv.chainId}; dexProtocol ${argv.dexProtocol}`);
        await Application.get(DexCoordinator).startOne(argv.chainId as ChainsIds, argv.dexProtocol as DexProtocolName);
      }
      ev.emit('done');
      break;
    }
    case 'estimate:gas-price': {
      await estimateGasPrice(settings);
      ev.emit('done');
      break;
    }
  }
})();
