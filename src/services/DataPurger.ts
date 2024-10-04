import {inject, injectable} from 'inversify';
import {Logger} from 'winston';

import TimeService from './TimeService.js';
import BlockRepository from '../repositories/BlockRepository.js';
import {CoingeckoDataRepository} from '../repositories/fetchers/CoingeckoDataRepository.js';

@injectable()
class DataPurger {
  @inject('Logger') protected logger!: Logger;
  @inject(TimeService) timeService!: TimeService;
  @inject(BlockRepository) blockRepository!: BlockRepository;
  @inject(CoingeckoDataRepository) coingeckoDataRepository!: CoingeckoDataRepository;

  private logPrefix = '[DataPurger] ';

  async apply(): Promise<void> {
    this.logger.debug(`${this.logPrefix} started`);

    const tStart = this.timeService.apply();

    const results = await Promise.allSettled([this.blockRepository.purge(), this.coingeckoDataRepository.purge()]);
    let totalDeleted = 0;

    results.forEach((r) => {
      if (r.status == 'rejected') {
        this.logger.error(`${this.logPrefix} error: ${r.reason}`);
      } else {
        totalDeleted += r.value;
      }
    });

    if (totalDeleted != 0) {
      const timeSpend = await this.timeService.apply() - tStart;
      this.logger.info(`${this.logPrefix} done, time spend: ${timeSpend}s`);
    } else {
      this.logger.debug(`${this.logPrefix} done.`);
    }
  }
}

export default DataPurger;
