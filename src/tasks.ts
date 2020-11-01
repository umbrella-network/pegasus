import './boot';
import yargs from 'yargs';
import fs from 'fs';
import path from 'path';
import { getModelForClass } from '@typegoose/typegoose';
import { uuid } from 'uuidv4';
import Feed from './models/Feed';
import { EventEmitter } from 'events';

const argv = yargs(process.argv.slice(2)).options({
  task: { type: 'string', demandOption: true }
}).argv;

async function dbLoadFeeds(): Promise<void> {
  const feedData = fs.readFileSync(path.resolve(__dirname, './config/feeds.json'), 'utf-8');
  const feeds = JSON.parse(feedData);
  const feedModel = getModelForClass(Feed);

  for (const data of feeds.data) {
    const id = data.id || uuid();

    await feedModel.findOneAndUpdate(
      {
        _id: id
      },
      {
        '$setOnInsert': {
          _id: id,
        },
        '$set': {
          sourceUrl: <string> data.sourceUrl,
          leafLabel: <string> data.leafLabel,
          valuePath: <string> data.valuePath,
          tolerance: <number> data.tolerance
        }
      },
      {
        upsert: true
      }
    );
  }
}

const ev = new EventEmitter();
ev.on('done', (e) => process.exit());

(async () => {
  switch (argv.task) {
    case 'db:load:feeds': {
      await dbLoadFeeds();
      ev.emit('done');
      break;
    }
  }
})();
