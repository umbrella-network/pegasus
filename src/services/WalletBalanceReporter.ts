import {inject, injectable} from 'inversify';
import {Logger} from 'winston';

@injectable()
class WalletBalanceReporter {
  @inject('Logger') logger!: Logger;

  async call(): Promise<void> {
    this.logger.debug(`[WalletBalanceReporter] deprecated`);
  }
}

export default WalletBalanceReporter;
