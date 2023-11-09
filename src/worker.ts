import {boot} from './boot.js';
import yargs from 'yargs';
import Application from './lib/Application.js';
import BlockMintingWorker from './workers/BlockMintingWorker.js';
import MetricsWorker from './workers/MetricsWorker.js';
import {ApplicationUpdateAgent} from './agents/ApplicationUpdateAgent.js';
import {BlockDispatcherWorker} from './workers/BlockDispatcherWorker.js';
import {DeviationLeaderWorker} from './workers/DeviationLeaderWorker.js';
import {DeviationDispatcherWorker} from './workers/DeviationDispatcherWorker.js';
import {BlockchainMetricsWorker} from './workers/BlockchainMetricsWorker.js';

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
      Application.get(DeviationDispatcherWorker).start();
      break;
    }
    case 'MetricsWorker': {
      Application.get(MetricsWorker).start();
      Application.get(BlockchainMetricsWorker).start();
      break;
    }
    case 'DeviationLeaderWorker': {
      Application.get(DeviationLeaderWorker).start();
      break;
    }
  }

  Application.get(ApplicationUpdateAgent).start();
})();
