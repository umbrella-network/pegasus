import {inject, injectable} from 'inversify';
import Blockchain from '../lib/Blockchain';
import {Logger} from 'winston';
import {utils} from 'ethers';
import StatsDClient from '../lib/StatsDClient';

@injectable()
class WalletBalanceReporter {
  @inject('Logger') logger!: Logger;
  @inject(Blockchain) blockchain!: Blockchain;

  async call(): Promise<void> {
    const balanceBigNumber = await this.blockchain.wallet.getBalance();
    const balance = parseFloat(utils.formatEther(balanceBigNumber)).toPrecision(4);

    this.logger.debug(`Wallet balance: ${balance}`);
    StatsDClient?.gauge('WalletBalance', balance);
  }
}

export default WalletBalanceReporter;
