import {inject, injectable} from 'inversify';
import {BigNumber} from 'ethers';
import {parseEther} from 'ethers/lib/utils';
import {Logger} from 'winston';

import Blockchain from '../../lib/Blockchain';
import {ChainsIds} from '../../types/ChainsIds';

@injectable()
export class BalanceService {
  @inject('Logger') logger!: Logger;

  async checkBalanceIsEnough(blockchain: Blockchain, chainId: ChainsIds): Promise<void> {
    const balance = await blockchain.wallet.getBalance();
    const toCurrency = parseEther;

    this.testBalanceThreshold(blockchain, chainId, balance, toCurrency, blockchain.wallet.address);
  }

  private testBalanceThreshold(
    blockchain: Blockchain,
    chainId: ChainsIds,
    balance: BigNumber,
    toCurrency: (amount: string) => BigNumber,
    address: string,
  ) {
    const {errorLimit, warningLimit} = blockchain.chainSettings.transactions.mintBalance;

    if (balance.lt(toCurrency(errorLimit))) {
      throw new Error(`[${chainId}] Balance (${address.slice(0, 10)}) is lower than ${errorLimit}`);
    }

    if (balance.lt(toCurrency(warningLimit))) {
      this.logger.warn(`[${chainId}] Balance (${address.slice(0, 10)}) is lower than ${warningLimit}`);
    }
  }
}
