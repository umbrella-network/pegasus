import Bull from 'bullmq';
import { Logger } from 'winston';
import { inject, injectable } from 'inversify';
import BlockMinter from '../services/BlockMinter';
import BasicWorker from './BasicWorker';
import Settings from '../types/Settings';

@injectable()
class BlockMintingWorker extends BasicWorker {
  @inject('Logger') logger!: Logger;
  @inject('Settings') settings!: Settings;
  @inject(BlockMinter) blockMinter!: BlockMinter;

  apply = async (job: Bull.Job): Promise<void> => {
    if (this.isStale(job)) return;

    try {
      this.logger.info(`Minting a new block at ${new Date().toISOString()}`);
      await this.blockMinter.apply();
    } catch (e) {
      this.logger.error(e);
    }
  }

  isStale = (job: Bull.Job): boolean => {
    const age = new Date().getTime() - job.timestamp;
    return age > this.settings.jobs.blockCreation.interval;
  }
}

export default BlockMintingWorker;
