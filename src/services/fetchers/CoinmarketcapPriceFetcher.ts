import axios from 'axios';
import {inject, injectable} from 'inversify';
import {JSONPath} from 'jsonpath-plus';

import Settings from '../../types/Settings';

@injectable()
class CoinmarketcapPriceFetcher {
  private apiKey: string;
  private timeout: number;

  constructor(
    @inject('Settings') settings: Settings
  ) {
    this.apiKey = settings.api.coinmarketcap.apiKey;
    this.timeout = settings.api.coinmarketcap.timeout;
  }

  async apply(params: any): Promise<number> {
    const sourceUrl = `https://pro-api.coinmarketcap.com/v1/cryptocurrency/quotes/latest?symbol=${params.symbol}&convert=${params.convert}&CMC_PRO_API_KEY=${this.apiKey}`;

    const response = await axios.get(sourceUrl, {
      timeout: this.timeout,
      timeoutErrorMessage: `Timeout exceeded: ${sourceUrl}`,
      headers: {'Authorization': `Apikey ${this.apiKey}`}
    });

    if (response.status !== 200) {
      throw new Error(response.data);
    }

    if (response.data.Response === 'Error') {
      throw new Error(response.data.Message);
    }

    return this.extractValue(response.data, '$.data.*.quote.*.price');
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private extractValue = (data: any, valuePath: string): number => {
    return JSONPath({json: data, path: valuePath})[0];
  }
}

export default CoinmarketcapPriceFetcher;
