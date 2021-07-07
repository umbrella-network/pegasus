import axios from 'axios';
import {inject, injectable} from 'inversify';
import {JSONPath} from 'jsonpath-plus';

import Settings from '../../types/Settings';

@injectable()
class PolygonIOSingleStockPriceFetcher {
  private apiKey: string;
  private timeout: number;

  constructor(
    @inject('Settings') settings: Settings
  ) {
    this.apiKey = settings.api.polygonIO.apiKey;
    this.timeout = settings.api.polygonIO.timeout;
  }

  // eslint-disable-next-line @typescript-eslint/explicit-module-boundary-types,@typescript-eslint/no-explicit-any
  async apply({sym}: any, raw = false): Promise<SinglePriceResponse | number> {
    const sourceUrl = `https://api.polygon.io/v1/last/stocks/${sym}?apiKey=${this.apiKey}`;

    const response = await axios.get(sourceUrl, {
      timeout: this.timeout,
      timeoutErrorMessage: `Timeout exceeded: ${sourceUrl}`,
    });

    if (response.status !== 200) {
      throw new Error(response.data);
    }

    return raw ? response.data as SinglePriceResponse : this.extractValue(response.data, '$.last.price');
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private extractValue = (data: any, valuePath: string): number => {
    return JSONPath({json: data, path: valuePath})[0];
  }
}


export interface SinglePriceResponse {
  symbol: string;
  last: {
    price: number,
    timestamp: number,
  },
}

export default PolygonIOSingleStockPriceFetcher;
