import axios from 'axios';
import {injectable, inject} from "inversify";
import {Logger} from 'winston';

import Settings from '../../types/Settings';

interface OptionsEntries {
  [key: string]: number;
}

interface OptionsPriceResponse {
  data: {
    [key: string]: {
      callPrice: number;
      iv: number;
      putPrice: number;
    }
  }
}

@injectable()
class OptionsPriceFetcher {
  private apiKey: string;
  private timeout: number;
  @inject('Logger') logger!: Logger;
  
  constructor(
    @inject('Settings') settings: Settings,
  ) {
    this.apiKey = settings.api.optionsPrice.apiKey;
    this.timeout = settings.api.optionsPrice.timeout; 
  }

  async apply(): Promise<OptionsEntries> {
    const sourceUrl = 'https://options-api.umb.network/options';

    try {
      const response = await axios.get(sourceUrl, {
        timeout: this.timeout,
        timeoutErrorMessage: `Timeout exceeded: ${sourceUrl}`,
        headers: {'Authorization': `Bearer ${this.apiKey}`}
      })

      return this.parseOptionPrices(response.data);
    } catch (err) {
      this.logger.warn(`Skipping OptionsPrice fetcher: ${err}`)
      return Promise.resolve({})
    }
  }

  private parseOptionPrices({ data: options }: OptionsPriceResponse) {
    const optionsEntries: OptionsEntries = {}

    for (const key in options) {
      optionsEntries[`OP:${key}_call_price`] = options[key].callPrice
      optionsEntries[`OP:${key}_iv`] = options[key].iv
      optionsEntries[`OP:${key}_put_price`] = options[key].putPrice
    }
  
    return optionsEntries
  }
}

export default OptionsPriceFetcher;
