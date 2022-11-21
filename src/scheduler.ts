import newrelic from 'newrelic';
import {Logger} from 'winston';

import {boot} from './boot';
import Application from './lib/Application';
import BlockMintingWorker from './workers/BlockMintingWorker';
import MetricsWorker from './workers/MetricsWorker';
import Settings, {BlockDispatcherSettings} from './types/Settings';
import {BlockDispatcherWorker} from './workers/BlockDispatcherWorker';
import {FeedDataWorker} from './workers/FeedDataWorker';

(async (): Promise<void> => {
  await boot();
  const settings: Settings = Application.get('Settings');
  const logger: Logger = Application.get('Logger');
  const blockMintingWorker = Application.get(BlockMintingWorker);
  const metricsWorker = Application.get(MetricsWorker);
  const blockDispatcherWorker = Application.get(BlockDispatcherWorker);
  const feedDataWorker = Application.get(FeedDataWorker);
  const jobCode = String(Math.floor(Math.random() * 1000));
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

  setInterval(async () => {
    logger.info('[Scheduler] Scheduling FeedAgent');

    await feedDataWorker.enqueue(
      {},
      {
        removeOnComplete: true,
        removeOnFail: true,
        jobId: `feed-worker-${jobCode}`,
      },
    );
  }, settings.jobs.fetcher.interval);

  const scheduleBlockDispatching = async (chainId: string): Promise<void> => {
    logger.info(`[${chainId}] Scheduling BlockDispatcherWorker dispatcher-${chainId}`);
    try {
      await blockDispatcherWorker.enqueue(
        {
          chainId,
        },
        {
          removeOnComplete: true,
          removeOnFail: true,
          jobId: `dispatcher-${chainId}-${jobCode}`,
        },
      );
    } catch (e) {
      newrelic.noticeError(e as Error);
      logger.error(e);
    }
  };

  for (const chainId of Object.keys(settings.blockchain.multiChains)) {
    const blockDispatcherSettings: BlockDispatcherSettings = (<Record<string, BlockDispatcherSettings>>(
      settings.jobs.blockDispatcher
    ))[chainId];

    setInterval(async () => scheduleBlockDispatching(chainId), blockDispatcherSettings.interval);
  }
})();
