import './boot';
import Application from './lib/Application';
import BlockMintingWorker from './workers/BlockMintingWorker';
import FeedSynchroSchedulingWorker from './workers/FeedSynchroSchedulingWorker';
import Settings from './types/Settings';

(async (): Promise<void> => {
  const settings: Settings = Application.get('Settings');
  const blockMintingWorker = Application.get(BlockMintingWorker);

  setInterval(async () => {
    await blockMintingWorker.enqueue({});
  }, settings.jobs.blockCreation.interval);

  const feedSynchroSchedulingWorker = Application.get(FeedSynchroSchedulingWorker);

  setInterval(async () => {
    await feedSynchroSchedulingWorker.enqueue({});
  }, 1000*60*1);
})();
