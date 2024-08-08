import axios from 'axios';
import {inject, injectable} from 'inversify';
import {Logger} from 'winston';

import Settings from '../../types/Settings.js';

export interface OptionsValues {
  callPrice: number;
  iv: number;
  putPrice: number;
  gamma: number;
  callDelta: number;
  putDelta: number;
}
export interface OptionsEntries {
  [key: string]: OptionsValues;
}

interface OptionsPriceResponse {
  data: {
    [key: string]: {
      callPrice: number;
      iv: number;
      putPrice: number;
      gamma: number;
      callDelta: number;
      putDelta: number;
    };
  };
}

@injectable()
export class OptionsPriceFetcher {
  private apiKey: string;
  private timeout: number;
  @inject('Logger') logger!: Logger;

  constructor(@inject('Settings') settings: Settings) {
    this.apiKey = settings.api.optionsPrice.apiKey;
    this.timeout = settings.api.optionsPrice.timeout;
  }

  async apply(): Promise<OptionsEntries> {
    const sourceUrl = 'https://options-api.umb.network/options';

    try {
      const response: {data: OptionsPriceResponse} = await axios.get(sourceUrl, {
        timeout: this.timeout,
        timeoutErrorMessage: `Timeout exceeded: ${sourceUrl}`,
        headers: {Authorization: `Bearer ${this.apiKey}`},
      });

      return response.data.data;
    } catch (err) {
      this.logger.warn(`Skipping OptionsPrice fetcher: ${err}`);
      return Promise.resolve({});
    }
  }
}
