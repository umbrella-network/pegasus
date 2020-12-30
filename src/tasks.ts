import 'dotenv';
import yargs from 'yargs';
import {EventEmitter} from 'events';

import './boot';
import Application from './lib/Application';
import FeedProcessor from './services/FeedProcessor';
import loadFeeds from './config/loadFeeds';

const argv = yargs(process.argv.slice(2)).options({
  task: { type: 'string', demandOption: true }
}).argv;

async function testFeeds(): Promise<void> {
  const feeds = await loadFeeds('./../config/feedsOnChain.json');
  const leaves = await Application.get(FeedProcessor).apply(feeds);

  console.log(leaves);
}

async function dbLoadFeeds(): Promise<void> {
  /*const feeds = await loadFeeds('./../config/feeds.json');
  const feedModel = getModelForClass(Feed);

  for (const data of feeds) {
    const id = uuid();

    await feedModel.findOneAndUpdate(
      {
        _id: id
      },
      {
        '$set': {
          sourceUrl: <string> data.sourceUrl,
          leafLabel: <string> data.leafLabel,
          calculator: <string> data.calculator,
          fetcher: <string> data.fetcher,
          discrepancy: <number> data.discrepancy
        },
        '$unset': {
          tolerance: true,
          name: true
        },
      },
      {
        upsert: true
      }
    );
  }*/
}

const ev = new EventEmitter();
ev.on('done', () => process.exit());

(async () => {
  switch (argv.task) {
    case 'db:load:feeds': {
      await dbLoadFeeds();
      ev.emit('done');
      break;
    }
    case 'test:feeds': {
      await testFeeds();
      ev.emit('done');
      break;
    }
  }
})();
