require('newrelic');
import './boot';
import Application from './lib/Application';
import BlockMintingWorker from './workers/BlockMintingWorker';
import Settings from './types/Settings';

(async (): Promise<void> => {
  const settings: Settings = Application.get('Settings');
  const blockMintingWorker = Application.get(BlockMintingWorker);

  setInterval(async () => {
    await blockMintingWorker.enqueue({});
  }, settings.jobs.blockCreation.interval);
})();
