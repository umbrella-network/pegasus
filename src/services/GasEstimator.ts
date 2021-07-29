import {Logger} from 'winston';
import {inject, injectable} from 'inversify';

import Blockchain from '../lib/Blockchain';
import Settings from '../types/Settings';
import {BlockWithTransactions} from '@ethersproject/abstract-provider';
import {GasMetrics} from '../types/GasMetrics';

@injectable()
class GasEstimator {
  @inject('Logger') logger!: Logger;
  @inject(Blockchain) blockchain!: Blockchain;
  @inject('Settings') settings!: Settings;

  async apply(): Promise<GasMetrics> {
    const block = await this.blockchain.provider.getBlockWithTransactions('latest');
    const metrics = GasEstimator.gasMetricsForBlock(block, this.settings.blockchain.transactions.maxGasPrice);

    metrics.estimation = Math.max(this.settings.blockchain.transactions.minGasPrice, metrics.min);

    return metrics;
  }

  private static gasMetricsForBlock(block: BlockWithTransactions, maxGasPrice: number): GasMetrics {
    let min = maxGasPrice;
    let max = 0;
    let sum = 0;
    let count = 0;

    block.transactions.forEach(({gasPrice}) => {
      if (!gasPrice) {
        return;
      }

      const gas = gasPrice.toNumber();
      sum += gas;
      count++;

      if (gas > 0 && gas < min) {
        min = gas;
      }

      if (gas > max) {
        max = gas;
      }
    });

    return {min, max, avg: sum / count, estimation: 0};
  }
}

export default GasEstimator;
