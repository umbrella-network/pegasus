import axios from 'axios';
import {inject, injectable} from 'inversify';
import {JSONPath} from 'jsonpath-plus';

import Settings from '../../types/Settings';

@injectable()
class CryptoComparePriceMultiFetcher {
  private apiKey: string;
  private timeout: number;

  constructor(
    @inject('Settings') settings: Settings
  ) {
    this.apiKey = settings.api.cryptocompare.apiKey;
    this.timeout = settings.api.cryptocompare.timeout;
  }

  async apply(params: {fsym: string[], tsyms: string[]}) {
    const {fsym, tsyms} = params;

    const sourceUrl =  `https://min-api.cryptocompare.com/data/pricemulti?fsyms=${fsym.join(',')}&tsyms=${tsyms.join(',')}`

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

    return this.extractValues(response.data, '$.*');
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private extractValues = (data: any, valuePath: string) => {
    interface valuePairs {fsym: string, tsyms: string, value: number};

    const valuePairsArr: valuePairs[] = [];
    const valuesArrays = JSONPath({json: data, path: valuePath});
    const fromKeys = Object.keys(data);

    fromKeys.forEach((fk, index) => {
      const toKeys = Object.keys(valuesArrays[index]); 
      toKeys.forEach(tk => {
        valuePairsArr.push({fsym: fk, tsyms: tk, value: valuesArrays[index][tk]});
      });
    });

    return valuePairsArr;
  }
}

export default CryptoComparePriceMultiFetcher;
