import Bull from 'bullmq';
import {Logger} from 'winston';
import {inject, injectable} from 'inversify';
import BlockMinter from '../services/BlockMinter';
import BasicWorker from './BasicWorker';
import Settings from '../types/Settings';
import CryptoCompareWSInitializer from '../services/CryptoCompareWSInitializer';

@injectable()
class BlockMintingWorker extends BasicWorker {
  @inject('Logger') logger!: Logger;
  @inject('Settings') settings!: Settings;
  @inject(BlockMinter) blockMinter!: BlockMinter;
  @inject(CryptoCompareWSInitializer) cryptoCompareWSInitializer!: CryptoCompareWSInitializer;

  apply = async (job: Bull.Job): Promise<void> => {
    if (this.isStale(job)) return;

    try {
      this.logger.info(`BlockMintingWorker job run at ${new Date().toISOString()}`);
      await this.blockMinter.apply();
    } catch (e) {
      this.logger.error(e);
    }
  }

  isStale = (job: Bull.Job): boolean => {
    const age = new Date().getTime() - job.timestamp;
    return age > this.settings.jobs.blockCreation.interval;
  }

  start = (): void => {
    super.start();

    this.cryptoCompareWSInitializer.apply().catch((err) => {
      this.logger.error(err);
      process.exit(1);
    });
  };
}

export default BlockMintingWorker;
