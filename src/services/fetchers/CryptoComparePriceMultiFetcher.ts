import axios from 'axios';
import {inject, injectable} from 'inversify';
import {JSONPath} from 'jsonpath-plus';

import Settings from '../../types/Settings';

@injectable()
class CryptoComparePriceMultiFetcher {
  private apiKey: string;
  private timeout: number;

  constructor(@inject('Settings') settings: Settings) {
    this.apiKey = settings.api.cryptocompare.apiKey;
    this.timeout = settings.api.cryptocompare.timeout;
  }

  async apply(params: InputParams): Promise<OutputValue[]> {
    const {fsyms, tsyms} = params;

    if (fsyms.length == 0) {
      throw new Error('[CryptoComparePriceMultiFetcher] empty fsyms');
    }

    if (tsyms.length == 0) {
      throw new Error('[CryptoComparePriceMultiFetcher] empty tsyms');
    }

    const sourceUrl = `https://min-api.cryptocompare.com/data/pricemulti?fsyms=${fsyms.join(',')}&tsyms=${tsyms.join(
      ',',
    )}`;

    const response = await axios.get(sourceUrl, {
      timeout: this.timeout,
      timeoutErrorMessage: `Timeout exceeded: ${sourceUrl}`,
      headers: {Authorization: `Apikey ${this.apiKey}`},
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
  private extractValues = (data: any, valuePath: string): OutputValue[] => {
    const valuePairs: OutputValue[] = [];
    const valuesArrays = JSONPath({json: data, path: valuePath});

    Object.keys(data).forEach((fk, index) => {
      Object.keys(valuesArrays[index]).forEach((tk) => {
        valuePairs.push({fsym: fk, tsym: tk, value: valuesArrays[index][tk]});
      });
    });

    return valuePairs;
  };
}

export interface OutputValue {
  fsym: string;
  tsym: string;
  value: number;
}

export interface InputParams {
  fsyms: string[];
  tsyms: string[];
}

export default CryptoComparePriceMultiFetcher;
