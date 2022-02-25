import axios from 'axios';
import {inject, injectable} from 'inversify';
import {Logger} from 'winston';

import Settings from '../../types/Settings';

@injectable()
class ArthCoinPriceFetcher {
  private timeout: number;
  @inject('Logger') logger!: Logger;

  constructor(@inject('Settings') settings: Settings) {
    this.timeout = settings.api.arthCoin.timeout;
  }

  async apply(params: {id: string}): Promise<number | undefined> {
    const sourceUrl = 'https://gmu.arthcoin.com/gmu';

    try {
      const response = await axios.get(sourceUrl, {
        timeout: this.timeout,
        timeoutErrorMessage: `Timeout exceeded: ${sourceUrl}`,
      });

      if (!Object.keys(response.data).length) {
        throw Error(`Empty response`);
      }

      return response.data[params.id];
    } catch (err) {
      this.logger.warn(`Skipping ArthCoinPrice fetcher: ${err}`);
      return Promise.resolve(undefined);
    }
  }
}

export default ArthCoinPriceFetcher;
