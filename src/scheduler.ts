import {Logger} from 'winston';

import {boot} from './boot.js';
import Application from './lib/Application.js';
import BlockMintingWorker from './workers/BlockMintingWorker.js';
import MetricsWorker from './workers/MetricsWorker.js';
import Settings, {BlockDispatcherSettings} from './types/Settings.js';
import {BlockDispatcherWorker} from './workers/BlockDispatcherWorker.js';
import {DeviationLeaderWorker} from './workers/DeviationLeaderWorker.js';
import DataPurger from './services/DataPurger.js';
import {DeviationDispatcherWorker} from './workers/DeviationDispatcherWorker.js';
import BasicWorker from './workers/BasicWorker.js';
import {ChainsIds} from './types/ChainsIds.js';
import {BlockchainMetricsWorker} from './workers/BlockchainMetricsWorker.js';
import {LiquidityWorkerRepository} from './repositories/LiquidityWorkerRepository.js';
import {DexProtocolName} from './types/Dexes.js';
import PriceFetchingWorker from './workers/PriceFetchingWorker.js';
import {FetcherName} from './types/fetchers';

(async (): Promise<void> => {
  await boot(true);

  const settings: Settings = Application.get('Settings');
  const logger: Logger = Application.get('Logger');
  const blockMintingWorker = Application.get(BlockMintingWorker);
  const deviationLeaderWorker = Application.get(DeviationLeaderWorker);
  const metricsWorker = Application.get(MetricsWorker);
  const dataPurger = Application.get(DataPurger);
  const blockDispatcherWorker = Application.get(BlockDispatcherWorker);
  const deviationDispatcherWorker = Application.get(DeviationDispatcherWorker);
  const liquidityWorkerRepository = Application.get(LiquidityWorkerRepository);
  const blockchainMetricsWorker = Application.get(BlockchainMetricsWorker);
  const priceFetchingWorker = Application.get(PriceFetchingWorker);

  const jobCode = Math.floor(Math.random() * 1000).toString();

  logger.info('[Scheduler] Starting scheduler...');

  setInterval(async () => dataPurger.apply(), 60 * 5 * 1000);

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
      logger.error(`[${chainId}] ${dispatcherId}: ${e}`);
    }
  };

  const schedulePriceWorker = async (priceWorker: BasicWorker, fetcherName: FetcherName): Promise<void> => {
    try {
      logger.info(`[Scheduler] PriceFetcherWorker for ${fetcherName} enqueued`);

      await priceWorker.enqueue(
        {
          fetcherName,
        },
        {
          removeOnComplete: true,
          removeOnFail: true,
          jobId: `${fetcherName}-${jobCode}`,
        },
      );
    } catch (e) {
      logger.error(`[Scheduling] ${fetcherName} error: ${(e as Error).message}`);
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

    setInterval(
      async () => scheduleDispatching(blockDispatcherWorker, 'dispatcher', chainId),
      blockDispatcherSettings.interval,
    );
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

  for (const fetcherName of Object.keys(settings.scheduler.fetchers)) {
    const {interval} = settings.scheduler.fetchers[fetcherName];
    logger.info(`[Scheduler] PriceFetcherWorker: ${fetcherName}, interval: ${interval}`);
    setInterval(async () => schedulePriceWorker(priceFetchingWorker, fetcherName as FetcherName), interval);
  }

  for (const chainId of Object.keys(settings.blockchain.multiChains)) {
    if (!deviationDispatcherWorker.dispatcher.exists(chainId as ChainsIds)) {
      logger.info(`[${chainId}] DeviationDispatcherWorker for ${chainId} not exists, skipping.`);
      continue;
    }

    const {deviationInterval} = (<Record<string, BlockDispatcherSettings>>settings.jobs.blockDispatcher)[chainId];

    setInterval(
      async () => scheduleDispatching(deviationDispatcherWorker, 'deviation-dispatcher', chainId),
      deviationInterval,
    );
  }

  for (const chainId of Object.keys(settings.jobs.liquidities)) {
    for (const [protocol, jobSettings] of Object.entries(settings.jobs.liquidities[chainId as ChainsIds]!)) {
      const workerName = `[${chainId}-${protocol}]`;
      const worker = liquidityWorkerRepository.find(protocol as DexProtocolName);

      if (!worker) {
        logger.error(`${workerName} not found`);
        continue;
      }

      setTimeout(async () => {
        logger.info(`initial run for ${workerName}`);

        await worker!.enqueue(
          {name: workerName, chainId, protocol, settings: jobSettings},
          {
            removeOnComplete: true,
            removeOnFail: true,
            jobId: `${chainId}-${protocol}`,
          },
        );
      }, 1000);

      setInterval(async () => {
        logger.info(`[Scheduler] Scheduling ${workerName}`);

        await worker!.enqueue(
          {name: workerName, chainId, settings: jobSettings},
          {
            removeOnComplete: true,
            removeOnFail: true,
            jobId: `${chainId}-${protocol}`,
          },
        );
      }, jobSettings.interval);
    }
  }
})();
