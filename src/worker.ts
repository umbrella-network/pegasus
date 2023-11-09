import {boot} from './boot';
import yargs from 'yargs';
import Application from './lib/Application';
import BlockMintingWorker from './workers/BlockMintingWorker';
import MetricsWorker from './workers/MetricsWorker';
import {ApplicationUpdateAgent} from './agents/ApplicationUpdateAgent';
import {BlockDispatcherWorker} from './workers/BlockDispatcherWorker';
import {DeviationLeaderWorker} from './workers/DeviationLeaderWorker';
import {DeviationDispatcherWorker} from './workers/DeviationDispatcherWorker';
import {BlockchainMetricsWorker} from './workers/BlockchainMetricsWorker';

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
