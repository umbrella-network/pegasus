import {boot} from './boot';
import yargs from 'yargs';
import Application from './lib/Application';
import BlockMintingWorker from './workers/BlockMintingWorker';
import MetricsWorker from './workers/MetricsWorker';
import {ApplicationUpdateAgent} from './agents/ApplicationUpdateAgent';
import {BlockDispatcherWorker} from './workers/BlockDispatcherWorker';
import {FeedDataWorker} from './workers/FeedDataWorker';
import {FeedWSDataWorker} from './workers/FeedWSDataWorker';

(async () => {
  await boot();

  const argv = yargs(process.argv.slice(2)).options({
    worker: {type: 'string', demandOption: true},
  }).argv;

  switch (argv.worker) {
    case 'BlockMintingWorker': {
      Application.get(BlockMintingWorker).start();
      break;
    }
    case 'BlockDispatcherWorker': {
      Application.get(BlockDispatcherWorker).start();
      break;
    }
    case 'FeedDataWorker': {
      Application.get(FeedDataWorker).start();
      break;
    }
    case 'FeedWSDataWorker': {
      Application.get(FeedWSDataWorker).start();
      break;
    }
    case 'MetricsWorker': {
      Application.get(MetricsWorker).start();
      break;
    }
  }

  Application.get(ApplicationUpdateAgent).start();
})();
