import {Logger} from 'winston';
import {inject, injectable} from 'inversify';

import Blockchain from '../lib/Blockchain';
import Settings from '../types/Settings';
import {BlockWithTransactions} from '@ethersproject/abstract-provider';

@injectable()
class GasEstimator {
  @inject('Logger') logger!: Logger;
  @inject(Blockchain) blockchain!: Blockchain;
  @inject('Settings') settings!: Settings;

  async apply(): Promise<number> {
    const block = await this.blockchain.provider.getBlockWithTransactions('latest');
    const lowestGasForBlock = GasEstimator.lowestGasForBlock(block, this.settings.blockchain.transactions.maxGasPrice);

    return Math.max(this.settings.blockchain.transactions.minGasPrice, lowestGasForBlock);
  }

  private static lowestGasForBlock(block: BlockWithTransactions, maxGasPrice: number): number {
    let minPrice = maxGasPrice;

    block.transactions.forEach(({gasPrice}) => {
      if (!gasPrice.isZero() && gasPrice.lt(minPrice)) {
        minPrice = gasPrice.toNumber();
      }
    });

    return minPrice;
  }
}

export default GasEstimator;
