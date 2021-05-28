import Bull from 'bullmq';
import {Logger} from 'winston';
import {inject, injectable} from 'inversify';

import WalletBalanceReporter from '../services/WalletBalanceReporter';
import BasicWorker from './BasicWorker';

@injectable()
class MetricsWorker extends BasicWorker {
  @inject('Logger') logger!: Logger;
  @inject(WalletBalanceReporter) walletBalanceReporter!: WalletBalanceReporter;

  apply = async (job: Bull.Job): Promise<void> => {
    try {
      this.logger.info(`Sending metrics to NewRelic ${job.data}`);
      await this.walletBalanceReporter.call();
    } catch (e) {
      this.logger.error(e);
    }
  };
}

export default MetricsWorker;
