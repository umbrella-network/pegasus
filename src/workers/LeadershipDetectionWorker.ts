import Bull from 'bull';
import { inject, injectable } from 'inversify';
import BlockMinter from '../services/BlockMinter';
import Worker from './Worker';

@injectable()
class LeadershipDetectionWorker extends Worker {
  @inject(BlockMinter) blockMinter!: BlockMinter;

  apply = async (job: Bull.Job): Promise<void> => {
    try {
      await job.takeLock()
      await this.blockMinter.apply();
    } catch (e) {
      console.log(e);
    } finally {
      await job.releaseLock();
    }
  }
}

export default LeadershipDetectionWorker;
