import './boot';
import yargs from 'yargs';
import Application from './lib/Application';
import {BasicAgent} from './agents/BasicAgent';
import {UniswapPoolScannerAgent} from './agents/UniswapPoolScannerAgent';
import {UniswapPriceScannerAgent} from './agents/UniswapPriceScannerAgent';
import {Logger} from 'winston';

const AGENTS: { [key: string]: typeof BasicAgent } = {
  UniswapPoolScannerAgent,
  UniswapPriceScannerAgent
};

const argv = yargs(process.argv.slice(2)).options({
  agent: { type: 'string' }
}).argv;

(async () => {
  const logger: Logger = Application.get('Logger');

  if (argv.agent) {
    logger.info(`Starting Agent: ${argv.agent}`);
    await Application.get(AGENTS[argv.agent]).start()
  } else {
    logger.info('Starting all Agents');
    await Promise.all(Object.values(AGENTS).map(agent => Application.get(agent).start()));
  }
})();
