import {inject, injectable} from 'inversify';
import {Logger} from 'winston';

import TimeService from './TimeService.js';
import BlockRepository from '../repositories/BlockRepository';
import {CoingeckoDataRepository} from '../repositories/fetchers/CoingeckoDataRepository.js';

@injectable()
class DataPurger {
  @inject('Logger') protected logger!: Logger;
  @inject(TimeService) timeService!: TimeService;
  @inject(BlockRepository) blockRepository!: BlockRepository;
  @inject(CoingeckoDataRepository) coingeckoDataRepository!: CoingeckoDataRepository;

  private logPrefix = '${this.logPrefix} ';

  async apply(): Promise<void> {
    this.logger.info(`${this.logPrefix} started`);

    console.time('DataPurger.chunk');

    const results = await Promise.allSettled([this.blockRepository.purge(), this.coingeckoDataRepository.purge()]);

    results.forEach((r) => {
      if (r.status == 'rejected') {
        this.logger.error(`${this.logPrefix} error: ${r.reason}`);
      }
    });

    console.timeEnd('DataPurger.chunk');

    this.logger.info(`${this.logPrefix} done.`);
  }
}

export default DataPurger;
