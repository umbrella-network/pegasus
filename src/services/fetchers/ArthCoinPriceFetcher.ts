import axios from 'axios';
import {inject, injectable} from 'inversify';
import {Logger} from 'winston';

import Settings from '../../types/Settings';

export interface OptionsEntries {
  [key: string]: {
    callPrice: number;
    iv: number;
    putPrice: number;
  };
}

interface ArthCoinPriceResponse {
  data: {
    [key: string]: {
      callPrice: number;
      iv: number;
      putPrice: number;
    };
  };
}

@injectable()
class ArthCoinPriceFetcher {
  private timeout: number;
  @inject('Logger') logger!: Logger;

  constructor(@inject('Settings') settings: Settings) {
    this.timeout = settings.api.arthCoin.timeout;
  }

  async apply(): Promise<OptionsEntries> {
    console.log('\n\nAAAAAAAAA\n\n');
    const sourceUrl = 'https://gmu.arthcoin.com/gmu';

    try {
      const response = await axios.get(sourceUrl, {
        timeout: this.timeout,
        timeoutErrorMessage: `Timeout exceeded: ${sourceUrl}`,
      });

      console.log('response DATA: ', response.data, '\n\n');

      return ArthCoinPriceFetcher.parseOptionPrices(response.data);
    } catch (err) {
      this.logger.warn(`Skipping ArthCoinPrice fetcher: ${err}`);
      return Promise.resolve({});
    }
  }

  private static parseOptionPrices({data: options}: ArthCoinPriceResponse) {
    const optionsEntries: OptionsEntries = {};

    for (const key in options) {
      const {callPrice, iv, putPrice} = options[key];
      optionsEntries[key] = {callPrice, iv, putPrice};
    }

    return optionsEntries;
  }
}

export default ArthCoinPriceFetcher;
