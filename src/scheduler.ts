import './boot';
import Application from './lib/Application';
import BlockMintingWorker from './workers/BlockMintingWorker';
import MetricsWorker from './workers/MetricsWorker';
import Settings from './types/Settings';
import {Logger} from 'winston';

(async (): Promise<void> => {
  const settings: Settings = Application.get('Settings');
  const logger: Logger = Application.get('Logger');
  const blockMintingWorker = Application.get(BlockMintingWorker);
  const metricsWorker = Application.get(MetricsWorker);
  logger.info('[Scheduler] Starting scheduler...');

  setInterval(async () => {
    logger.info('[Scheduler] Scheduling MetricsWorker');

    await metricsWorker.enqueue({}, {
      removeOnComplete: true,
      removeOnFail: true,
    });
  }, settings.jobs.metricsReporting.interval);

  setInterval(async () => {
    logger.info('[Scheduler] Scheduling BlockMintingWorker');

    await blockMintingWorker.enqueue({}, {
      removeOnComplete: true,
      removeOnFail: true,
    });
  }, settings.jobs.blockCreation.interval);
})();
