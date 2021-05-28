import './boot';
import Application from './lib/Application';
import BlockMintingWorker from './workers/BlockMintingWorker';
import MetricsWorker from './workers/MetricsWorker';
import Settings from './types/Settings';

(async (): Promise<void> => {
  const settings: Settings = Application.get('Settings');
  const blockMintingWorker = Application.get(BlockMintingWorker);
  const metricsWorker = Application.get(MetricsWorker);

  setInterval(async () => {
    await metricsWorker.enqueue({});
  }, settings.jobs.metricsReporting.interval);

  setInterval(async () => {
    await blockMintingWorker.enqueue({});
  }, settings.jobs.blockCreation.interval);
})();
