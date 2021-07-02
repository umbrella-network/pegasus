import axios from 'axios';
import {inject, injectable} from 'inversify';
import {JSONPath} from 'jsonpath-plus';

import Settings from '../../types/Settings';

@injectable()
class GVolImpliedVolatilityFetcher {
  private apiKey: string;
  private timeout: number;

  constructor(
    @inject('Settings') settings: Settings
  ) {
    this.apiKey = settings.api.genesisVolatility.apiKey;
    this.timeout = settings.api.genesisVolatility.timeout;
  }

  // eslint-disable-next-line @typescript-eslint/explicit-module-boundary-types,@typescript-eslint/no-explicit-any
  async apply(params: any): Promise<number> {
    const sourceUrl = 'https://app.pinkswantrading.com/graphql';

    const response = await axios.get(sourceUrl, {
      timeout: this.timeout,
      method: 'POST',
      timeoutErrorMessage: `Timeout exceeded: ${sourceUrl}`,
      headers: {
        'Content-Type': 'application/json',
        'Accept': '*/*',
        'x-oracle': this.apiKey,
        'Accept-Language': 'en-US,en;q=0.9',
      },
      data: {
        query: `query ChainlinkIV($symbol: SymbolEnumType) {
          ChainlinkIv(symbol: $symbol) {
            ${params.query}
          }
        }`,
        variables: {
          symbol: params.sym,
        },
      }
    });

    if (response.status !== 200) {
      throw new Error(response.data);
    }

    if (response.data.Response === 'Error') {
      throw new Error(response.data.Message);
    }

    return this.extractValue(response.data, `$.[:0].${params.query}`);
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private extractValue = (data: any, valuePath: string): number => {
    return JSONPath({json: data, path: valuePath})[0];
  }
}

export default GVolImpliedVolatilityFetcher;
