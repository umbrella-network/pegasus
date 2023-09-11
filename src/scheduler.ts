import newrelic from 'newrelic';
import {Logger} from 'winston';

import {boot} from './boot';
import Application from './lib/Application';
import BlockMintingWorker from './workers/BlockMintingWorker';
import MetricsWorker from './workers/MetricsWorker';
import Settings, {BlockDispatcherSettings} from './types/Settings';
import {BlockDispatcherWorker} from './workers/BlockDispatcherWorker';
import {DeviationLeaderWorker} from './workers/DeviationLeaderWorker';
import DataPurger from "./services/DataPurger";
import {DeviationDispatcherWorker} from "./workers/DeviationDispatcherWorker";
import BasicWorker from "./workers/BasicWorker";
import {ChainsIds} from "./types/ChainsIds";
import {BlockchainMetricsWorker} from "./workers/BlockchainMetricsWorker";

const {NEW_RELIC_LABELS} = process.env;

(async (): Promise<void> => {
  await boot();

  const settings: Settings = Application.get('Settings');
  const logger: Logger = Application.get('Logger');
  const blockMintingWorker = Application.get(BlockMintingWorker);
  const deviationLeaderWorker = Application.get(DeviationLeaderWorker);
  const metricsWorker = Application.get(MetricsWorker);
  const dataPurger = Application.get(DataPurger);
  const blockDispatcherWorker = Application.get(BlockDispatcherWorker);
  const deviationDispatcherWorker = Application.get(DeviationDispatcherWorker);
  const blockchainMetricsWorker = Application.get(BlockchainMetricsWorker);

  const jobCode = Math.floor(Math.random() * 1000).toString();

  logger.info('[Scheduler] Starting scheduler...');

  setTimeout(() => dataPurger.apply(), 100);

  if (NEW_RELIC_LABELS) {
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
  }

  setTimeout(async () => {
    logger.info('initial run for ValidatorListWorker');

    await blockchainMetricsWorker.enqueue(
      {},
      {
        removeOnComplete: true,
        removeOnFail: true,
      },
    );
  }, 1000);

  setInterval(async () => {
    logger.info('[Scheduler] Scheduling ValidatorListWorker');

    await blockchainMetricsWorker.enqueue(
      {},
      {
        removeOnComplete: true,
        removeOnFail: true,
      },
    );
  }, settings.jobs.blockchainMetrics.interval);

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

  const scheduleDispatching = async (dispatcher: BasicWorker, dispatcherId: string, chainId: string): Promise<void> => {
    logger.info(`[${chainId}] Scheduling DispatcherWorker: ${dispatcherId}-${chainId}`);

    try {
      await dispatcher.enqueue(
        {
          chainId,
        },
        {
          removeOnComplete: true,
          removeOnFail: true,
          jobId: `${dispatcherId}-${chainId}-${jobCode}`,
        },
      );
    } catch (e) {
      newrelic.noticeError(e as Error);
      logger.error(e);
    }
  };

  for (const chainId of Object.keys(settings.blockchain.multiChains)) {
    if (!blockDispatcherWorker.dispatcher.exists(chainId as ChainsIds)) {
      logger.info(`[${chainId}] BlockDispatcherWorker for ${chainId} not exists, skipping.`);
      continue;
    }

    const blockDispatcherSettings: BlockDispatcherSettings = (<Record<string, BlockDispatcherSettings>>(
      settings.jobs.blockDispatcher
    ))[chainId];

    setInterval(async () => scheduleDispatching(blockDispatcherWorker, 'dispatcher', chainId), blockDispatcherSettings.interval);
  }

  setInterval(async () => {
    logger.info('[Scheduler] Scheduling DeviationLeaderWorker');

    await deviationLeaderWorker.enqueue(
      {},
      {
        removeOnComplete: true,
        removeOnFail: true,
      },
    );
  }, settings.deviationTrigger.leaderInterval);

  for (const chainId of Object.keys(settings.blockchain.multiChains)) {
    if (!deviationDispatcherWorker.dispatcher.exists(chainId as ChainsIds)) {
      logger.info(`[${chainId}] DeviationDispatcherWorker for ${chainId} not exists, skipping.`);
      continue;
    }

    const {deviationInterval} = (<Record<string, BlockDispatcherSettings>>(
      settings.jobs.blockDispatcher
    ))[chainId];

    setInterval(async () => scheduleDispatching(deviationDispatcherWorker, 'deviation-dispatcher', chainId), deviationInterval);
  }
})();
