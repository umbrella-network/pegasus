import {boot} from './boot';
import yargs from 'yargs';
import Application from './lib/Application';
import BlockMintingWorker from './workers/BlockMintingWorker';
import MetricsWorker from './workers/MetricsWorker';

(async () => {
  await boot();

  const argv = yargs(process.argv.slice(2)).options({
    worker: { type: 'string', demandOption: true }
  }).argv;

  switch (argv.worker) {
    case 'BlockMintingWorker': {
      Application.get(BlockMintingWorker).start();
      break;
    }
    case 'MetricsWorker': {
      Application.get(MetricsWorker).start();
      break;
    }
  }
})()
