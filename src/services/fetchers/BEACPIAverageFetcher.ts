import {inject, injectable} from 'inversify';

import CryptoCompareWSClient from '../ws/CryptoCompareWSClient';
import {Pair} from '../../types/Feed';
import Settings from '../../types/Settings';
import {mapParams} from '../../utils/request';
import axios from 'axios';
import {JSONPath} from 'jsonpath-plus';
import {mean, volumeWeightedAveragePrice} from '@umb-network/validator/dist/price';


@injectable()
class BEACPIAverageFetcher {
  private apiKey: string;
  private timeout: number;

  constructor(
    @inject('Settings') settings: Settings
  ) {
    this.apiKey = settings.api.bea.apiKey;
    this.timeout = settings.api.bea.timeout;
  }

  async apply({months}: any): Promise<number> {
    const year = new Date().getFullYear();
    const prevYear = year - 1;

    const sourceUrl = `https://apps.bea.gov/api/data/?UserID=${this.apiKey}&method=GetData&DataSetName=NIPA&TableName=T20804&Frequency=M&Year=${year},${prevYear}&ResultFormat=json`;

    const response = await axios.get(sourceUrl, {
      timeout: this.timeout,
      timeoutErrorMessage: `Timeout exceeded: ${sourceUrl}`,
    });

    if (response.status !== 200) {
      throw new Error(response.data);
    }

    const {Data, Error: error} = response.data.BEAAPI.Results;

    if (error) {
      throw new Error(error.APIErrorDescription);
    }

    const values = this.extractValue(Data, '$.[?(@.SeriesCode =="DPCERG")].DataValue').slice(-months);

    return mean(values.map(parseFloat));
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private extractValue = (data: any, valuePath: string): any => {
    return JSONPath({json: data, path: valuePath});
  }
}

export default BEACPIAverageFetcher;
