import axios from 'axios';
import {inject, injectable} from 'inversify';
import {JSONPath} from 'jsonpath-plus';

import Settings from '../../types/Settings';

@injectable()
class IEXEnergyFetcher {
  private apiKey: string;
  private timeout: number;

  constructor(
    @inject('Settings') settings: Settings
  ) {
    this.apiKey = settings.api.iex.apiKey;
    this.timeout = settings.api.iex.timeout;
  }

  // eslint-disable-next-line @typescript-eslint/explicit-module-boundary-types,@typescript-eslint/no-explicit-any
  async apply({sym}: any): Promise<number> {
    const sourceUrl = `https://cloud.iexapis.com/stable/time-series/energy/${sym}?token=${this.apiKey}`;

    const response = await axios.get(sourceUrl, {
      timeout: this.timeout,
      timeoutErrorMessage: `Timeout exceeded: ${sourceUrl}`,
    });

    if (response.status !== 200) {
      throw new Error(response.data);
    }

    return this.extractValue(response.data, '$.*.value');
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private extractValue = (data: any, valuePath: string): number => {
    return JSONPath({json: data, path: valuePath})[0];
  }
}

export default IEXEnergyFetcher;
