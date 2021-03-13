import axios from 'axios';
import {inject, injectable} from 'inversify';
import {JSONPath} from 'jsonpath-plus';

import Settings from '../../types/Settings';

@injectable()
class CoingeckoPriceFetcher {
  private timeout: number;

  constructor(
    @inject('Settings') settings: Settings
  ) {
    this.timeout = settings.api.coingecko.timeout;
  }

  async apply(params: any): Promise<number> {
    const sourceUrl = `https://api.coingecko.com/api/v3/coins/markets?vs_currency=${params.currency}&ids=${params.id}`;

    const response = await axios.get(sourceUrl, {
      timeout: this.timeout,
      timeoutErrorMessage: `Timeout exceeded: ${sourceUrl}`,
    });

    if (response.status !== 200) {
      throw new Error(response.data);
    }

    if (response.data.Response === 'Error') {
      throw new Error(response.data.Message);
    }

    return this.extractValue(response.data, '$.*.current_price');
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private extractValue = (data: any, valuePath: string): number => {
    return JSONPath({json: data, path: valuePath})[0];
  }
}

export default CoingeckoPriceFetcher;
