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

const argv = yargs(process.argv.slice(2)).options({
  task: { type: 'string', demandOption: true }
}).argv;

async function testFeeds(settings: Settings): Promise<void> {
  let feeds = await loadFeeds(settings.feedsFile);
  let leaves = await Application.get(FeedProcessor).apply(feeds);
  console.log('Feeds: ', leaves);

  feeds = await loadFeeds(settings.feedsOnChain);
  leaves = await Application.get(FeedProcessor).apply(feeds);
  console.log('On-chain feeds: ', leaves);
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
    case 'test:feeds': {
      await testFeeds(settings);
      ev.emit('done');
      break;
    }
  }
})();

