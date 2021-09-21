import {inject, injectable} from 'inversify';
import {Logger} from 'winston';

import KaikoPriceStreamClient from '../stream/KaikoPriceStreamClient';
import PairRepository from '../repositories/PairRepository';
import {Pair} from '../types/Feed';
import Settings from '../types/Settings';

const FETCHER_NAME = 'KaikoPriceStream';

@injectable()
class KaikoPriceStreamInitializer {
  @inject(KaikoPriceStreamClient) kaikoPriceStreamClient!: KaikoPriceStreamClient;
  @inject('Settings') settings!: Settings;
  @inject('Logger') logger!: Logger;
  @inject(PairRepository) pairRepository!: PairRepository;

  // calculate minutes
  fileUpdateInterval = 5 * 60 * 1000;

  async apply(): Promise<void> {
    let initialPairs = await this.getPairs();
    this.kaikoPriceStreamClient.start(initialPairs);

    // Update subscriptions routine
    setInterval(async () => {
      const newPairs = await this.getPairs();

      if (JSON.stringify(initialPairs) != JSON.stringify(newPairs)) {
        this.logger.info('Feeds file updated, updating stream feeds');
        this.kaikoPriceStreamClient.stop();
        this.kaikoPriceStreamClient.start(newPairs);
        initialPairs = newPairs;
      }
    }, this.fileUpdateInterval);
  }

  private async getPairs(): Promise<Pair[]> {
    return this.pairRepository.getPairsByFetcher(FETCHER_NAME);
  }
}

export default KaikoPriceStreamInitializer;
