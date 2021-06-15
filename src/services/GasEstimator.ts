import {Logger} from 'winston';
import {inject, injectable} from 'inversify';

import Blockchain from '../lib/Blockchain';
import Settings from '../types/Settings';

@injectable()
class GasEstimator {
  @inject('Logger') logger!: Logger;
  @inject(Blockchain) blockchain!: Blockchain;
  @inject('Settings') settings!: Settings;

  async apply(): Promise<number> {
    const block = await this.blockchain.provider.getBlockWithTransactions('latest');

    let minPrice = this.settings.blockchain.transactions.maxGasPrice;

    block.transactions.forEach(({gasPrice}) => {
      if (!gasPrice.isZero()) {
        minPrice = Math.min(minPrice, gasPrice.toNumber());
      }
    });

    return Math.max(minPrice, this.settings.blockchain.transactions.minGasPrice);
  }
}

export default GasEstimator;
