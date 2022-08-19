import newrelic from 'newrelic';
import {Logger} from 'winston';

import {boot} from './boot';
import Application from './lib/Application';
import BlockMintingWorker from './workers/BlockMintingWorker';
import MetricsWorker from './workers/MetricsWorker';
import Settings, {BlockDispatcherSettings} from './types/Settings';
import {BlockDispatcherWorker} from './workers/BlockDispatcherWorker';
import {ChainsIds} from './types/ChainsIds';

(async (): Promise<void> => {
  await boot();
  const settings: Settings = Application.get('Settings');
  const logger: Logger = Application.get('Logger');
  const blockMintingWorker = Application.get(BlockMintingWorker);
  const metricsWorker = Application.get(MetricsWorker);
  const blockDispatcherWorker = Application.get(BlockDispatcherWorker);
  logger.info('[Scheduler] Starting scheduler...');

  setInterval(async () => {
    logger.info('[Scheduler] Scheduling MetricsWorker');

    await metricsWorker.enqueue(
      {},
      {
        removeOnComplete: true,
        removeOnFail: true,
      },
    );
  }, settings.jobs.metricsReporting.interval);

  setInterval(async () => {
    logger.info('[Scheduler] Scheduling BlockMintingWorker');

    await blockMintingWorker.enqueue(
      {},
      {
        removeOnComplete: true,
        removeOnFail: true,
      },
    );
  }, settings.jobs.blockCreation.interval);

  const scheduleBlockReplication = async (
    blockDispatcherSettings: BlockDispatcherSettings,
    chainId: string,
  ): Promise<void> => {
    logger.info('[Scheduler] Scheduling BlockDispatcherWorker');
    try {
      await blockDispatcherWorker.enqueue(
        {
          chainId,
          lockTTL: blockDispatcherSettings.lockTTL,
          interval: blockDispatcherSettings.interval,
        },
        {
          removeOnComplete: true,
          removeOnFail: true,
        },
      );
    } catch (e) {
      newrelic.noticeError(e as Error);
      logger.error(e);
    }
  };

  for (const chainId of Object.values(ChainsIds)) {
    const blockDispatcherSettings: BlockDispatcherSettings = (<Record<string, BlockDispatcherSettings>>(
      settings.jobs.blockDispatcher
    ))[chainId];

    setInterval(
      async () => scheduleBlockReplication(blockDispatcherSettings, chainId),
      blockDispatcherSettings.interval,
    );
  }
})();
